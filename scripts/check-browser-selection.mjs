// Opt-in live selection checks: no prompts, uploads, or API requests.
import assert from 'node:assert/strict';
import CDP from 'chrome-remote-interface';
import { ensureChatGptSelection } from '../dist/src/browser/actions/chatGptSelection.js';
import { resolveChatGptSelection } from '../dist/src/browser/selectionPlan.js';

const port = Number(process.env.ORACLE_CDP_PORT ?? 9222);
const target = await CDP.New({ port, url: 'https://chatgpt.com/' });
let client;
const saved = [];
let initialSurface;
const silent = () => {};
try {
  client = await CDP({ port, target });
  let state;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      state = await client.Runtime.evaluate({ returnByValue: true, expression: `(() => {
        const surface = document.querySelector('[data-tpp-toggle-value][aria-checked="true"]')?.getAttribute('data-tpp-toggle-value');
        if (!surface || !document.querySelector('main button.__composer-pill')) return null;
        return {
          surface: surface === 'work' ? 'work' : 'chat',
          draft: document.querySelector('#prompt-textarea')?.innerText.trim(),
          turns: document.querySelectorAll('[data-message-author-role="user"]').length,
        };
      })()` });
      if (state.result?.value) break;
    } catch (error) {
      if (!/execution context/i.test(error.message)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!state?.result?.value) throw new Error('A signed-in ChatGPT home page with Chat/Work controls is required.');
  assert.equal(state.result.value.draft, '', 'Do not alter a draft');
  assert.equal(state.result.value.turns, 0);
  initialSurface = state.result.value.surface;
  for (const surface of [initialSurface, initialSurface === 'chat' ? 'work' : 'chat']) {
    saved.push(await ensureChatGptSelection(client.Runtime,
      { surface, requestedModel: 'current', modelLabel: null, level: null, strategy: 'current' }, silent));
  }
  const cases = [
    ...['instant', 'medium', 'high', 'xhigh', 'pro'].map(thinkingTime => ({ surface: 'chat', model: 'gpt-chat-latest', thinkingTime })),
    { surface: 'chat', model: 'gpt-5.6-sol', thinkingTime: 'pro' },
    { surface: 'chat', model: 'gpt-5.5', thinkingTime: 'pro' },
    { surface: 'work', model: 'gpt-6-astra', thinkingTime: 'ultra' },
    ...['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].map(thinkingTime => ({ surface: 'work', model: 'gpt-6-sol', thinkingTime })),
    ...['low', 'medium', 'high', 'xhigh', 'max'].map(thinkingTime => ({ surface: 'work', model: 'gpt-6-luna', thinkingTime })),
    { surface: 'work', model: 'gpt-5.6-sol', thinkingTime: 'ultra' },
    { surface: 'work', model: 'gpt-5.6-terra', thinkingTime: 'ultra' },
    { surface: 'work', model: 'gpt-5.6-luna', thinkingTime: 'max' },
    { surface: 'work', model: 'gpt-5.5', thinkingTime: 'xhigh' },
    { surface: 'work', model: 'gpt-work-default' },
  ];
  for (const input of cases) {
    const plan = resolveChatGptSelection(input);
    for (const observeOnly of [false, true]) {
      const evidence = await ensureChatGptSelection(client.Runtime, plan, silent, { observeOnly });
      assert.equal(evidence.surface, plan.surface);
      assert.equal(evidence.resolvedLabel, plan.modelLabel);
      if (plan.level) assert.equal(evidence.resolvedLevel, plan.level);
      assert.equal(evidence.identityVerified, false);
    }
    console.log(JSON.stringify({ surface: input.surface, model: plan.modelLabel, level: plan.level, verified: true }));
  }
  const clean = await client.Runtime.evaluate({ returnByValue: true, expression: `({
    draft: document.querySelector('#prompt-textarea')?.innerText.trim(),
    turns: document.querySelectorAll('[data-message-author-role="user"]').length,
    path: location.pathname,
  })` });
  assert.equal(clean.result.value.draft, '');
  assert.equal(clean.result.value.turns, 0);
  assert.equal(clean.result.value.path, '/');
  console.log(`PASS: ${cases.length} live selections and read-only rechecks; no messages submitted.`);
} finally {
  try {
    if (client) {
      // Restore both surfaces, finishing on the originally selected surface.
      for (const snapshot of [...saved].reverse()) {
        await ensureChatGptSelection(client.Runtime, {
          surface: snapshot.surface, requestedModel: snapshot.resolvedLabel,
          modelLabel: snapshot.resolvedLabel, level: snapshot.resolvedLevel, strategy: 'select',
        }, silent);
        if (snapshot.resolvedLabel === 'Default') {
          const restored = await client.Runtime.evaluate({ awaitPromise: true, returnByValue: true, expression: `(async () => {
            const pause = () => new Promise(resolve => setTimeout(resolve, 200));
            document.querySelector('main button.__composer-pill').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
            await pause();
            const value = () => Number(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'));
            for (let i = 0; value() !== ${snapshot.sliderValue} && i < 6; i++) {
              document.querySelector('[aria-keyshortcuts]').dispatchEvent(new KeyboardEvent('keydown', { key: value() < ${snapshot.sliderValue} ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
              await pause();
            }
            const result = value();
            document.querySelector('[role="menu"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            return result;
          })()` });
          assert.equal(restored.result?.value, snapshot.sliderValue);
        }
      }
      if (saved.length) console.log('Original surface and selected model/level restored.');
    }
  } finally {
    if (client) await client.close();
    await CDP.Close({ port, id: target.id });
  }
}
