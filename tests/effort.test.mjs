import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = process.env.ORACLE_PACKAGE_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const load = (relative) => import(pathToFileURL(`${root}/dist/src/${relative}.js`));
const { normalizeThinkingTimeLevel } = await load('oracle/thinkingTime');
const { ensureThinkingTime, buildThinkingTimeExpressionForTest } = await load('browser/actions/thinkingTime');
const { runBrowserPreview } = await load('cli/dryRun');

test('reasoning aliases remain independent from model selection', () => {
  for (const [input, expected] of [['low', 'light'], ['medium', 'standard'], ['high', 'extended'], ['xhigh', 'heavy']]) {
    assert.equal(normalizeThinkingTimeLevel(input), expected);
    new vm.Script(buildThinkingTimeExpressionForTest(expected, 'GPT-6 Astra'));
  }
  assert.equal(normalizeThinkingTimeLevel('unknown'), null);
});

test('every explicit effort fails on missing or unverified selection', async () => {
  for (const status of ['chip-not-found', 'menu-not-found', 'option-not-found', 'selection-unverified', 'model-kind-not-found', 'unknown']) {
    for (const level of ['light', 'standard', 'extended', 'heavy']) {
      const runtime = { evaluate: async () => ({ result: { value: { status } } }) };
      await assert.rejects(ensureThinkingTime(runtime, level, () => {}, 'GPT-6 Astra'), /refusing to submit/);
    }
  }
});

test('reasoning selection rechecks the model without selecting it again', async () => {
  for (const modelLabel of ['GPT-6 Astra', 'GPT-5.6 Sol', 'Pro']) {
    let calls = 0;
    const runtime = { evaluate: async () => ({ result: { value: ++calls === 1
      ? { status: 'switched', label: 'Extra High' }
      : { status: 'already-selected', label: modelLabel } } }) };
    if (modelLabel === 'GPT-6 Astra') {
      const evidence = await ensureThinkingTime(runtime, 'heavy', () => {}, 'GPT-6 Astra');
      assert.equal(evidence.verified, true);
      assert.equal(evidence.resolvedLabel, 'Extra High');
    } else {
      await assert.rejects(ensureThinkingTime(runtime, 'heavy', () => {}, 'GPT-6 Astra'), /requires GPT-6 Astra/);
    }
    assert.equal(calls, 2);
  }
});

test('English and Chinese strengths do not conflate high and extra high', async () => {
  for (const [level, positive, negative] of [
    ['light', ['Low', '低'], ['High', 'Extra High']],
    ['extended', ['High', '高'], ['Extra High', '极高']],
    ['heavy', ['Extra High', '极高'], ['High', '高']],
  ]) {
    const expression = buildThinkingTimeExpressionForTest(level, 'GPT-6 Astra');
    const instrumented = expression.replace('const matchesAnyEffortLevel =', 'return matchesLevel; const matchesAnyEffortLevel =');
    const matches = await new vm.Script(instrumented).runInNewContext({});
    for (const label of positive) assert.equal(matches(label), true, `${level}: ${label}`);
    for (const label of negative) assert.equal(matches(label), false, `${level}: ${label}`);
  }
});

test('preview exposes both model and requested reasoning intensity', async () => {
  const output = [];
  await runBrowserPreview({
    runOptions: { model: 'gpt-6-astra', prompt: 'test' }, cwd: '/tmp', version: 'test',
    previewMode: 'json', log: (line) => output.push(line),
    browserConfig: { desiredModel: 'GPT-6 Astra', thinkingTime: 'heavy' },
  }, { assembleBrowserPromptImpl: async () => ({
    attachments: [], estimatedInputTokens: 1, composerText: 'test', inlineFileCount: 0, bundled: null,
  }) });
  const payload = JSON.parse(output.find((line) => line.startsWith('{')));
  assert.equal(payload.desiredModel, 'GPT-6 Astra');
  assert.equal(payload.thinkingTime, 'heavy');
});
