import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = process.env.ORACLE_PACKAGE_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const { ensureChatGptSelection } = await import(pathToFileURL(`${root}/dist/src/browser/actions/chatGptSelection.js`));
const { resolveChatGptSelection } = await import(pathToFileURL(`${root}/dist/src/browser/selectionPlan.js`));

// Execute the actual injected browser function against a minimal menu DOM.
// Unlike a mocked CDP result, this exercises label parsing and option selection.
function menuRuntime(modelText, { initiallySelected = false } = {}) {
  let open = true;
  let selected = initiallySelected ? 1 : 0;
  let modelClicks = 0;
  const visible = { closest: () => null, getBoundingClientRect: () => ({ width: 10, height: 10 }) };
  const items = ['最新', modelText].map((innerText, index) => ({
    ...visible, innerText,
    getAttribute: (name) => name === 'aria-checked' ? String(selected === index) : null,
    click: () => { selected = index; modelClicks++; },
  }));
  const slider = { getAttribute: (name) => ({ 'aria-valuenow': '4', 'aria-valuemin': '0', 'aria-valuemax': '4' })[name] };
  const menu = {
    closest: () => ({ dispatchEvent: () => { open = false; } }),
    querySelectorAll: (selector) => selector === '[role="menuitemradio"]' ? items : selector === '[aria-keyshortcuts]' ? [visible] : [],
    querySelector: (selector) => selector === '[role="slider"]' ? slider : { innerText: 'Pro，第 5 项，共 5 项。' },
  };
  const document = {
    querySelector: (selector) => selector.includes('data-tpp-toggle-value')
      ? { getAttribute: () => 'chatgpt' }
      : selector.includes('composer-intelligence-picker-content') && open ? menu : null,
  };
  return {
    evaluate: async ({ expression }) => ({ result: { value: await vm.runInNewContext(expression, {
      document, setTimeout, KeyboardEvent: class {}, PointerEvent: class {},
    }) } }),
    clicks: () => modelClicks,
  };
}

for (const note of ['将于 10月14日下线', 'Retiring October 14']) {
  test(`selects exact GPT-5.5 model despite secondary notice: ${note}`, async () => {
    const runtime = menuRuntime(`GPT-5.5\n${note}`);
    const plan = resolveChatGptSelection({ model: 'gpt-5.5-pro' });
    const evidence = await ensureChatGptSelection(runtime, plan, () => {});
    assert.equal(evidence.resolvedLabel, 'GPT-5.5');
    assert.equal(evidence.resolvedLevel, 'pro');
    assert.equal(runtime.clicks(), 1);
    const observed = menuRuntime(`GPT-5.5\n${note}`, { initiallySelected: true });
    await ensureChatGptSelection(observed, plan, () => {}, { observeOnly: true });
    assert.equal(observed.clicks(), 0);
  });
}

test('a different model sharing a prefix is never substituted', async () => {
  const runtime = menuRuntime('GPT-5.5 Pro\nRetiring October 14');
  await assert.rejects(ensureChatGptSelection(runtime,
    resolveChatGptSelection({ model: 'gpt-5.5-pro' }), () => {}), /absent/);
  assert.equal(runtime.clicks(), 0);
});
