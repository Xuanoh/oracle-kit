import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = process.env.ORACLE_PACKAGE_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const load = (relative) => import(pathToFileURL(`${root}/dist/src/${relative}.js`));
const { resolveChatGptSelection, levelsForSelection } = await load('browser/selectionPlan');
const { ensureChatGptSelection } = await load('browser/actions/chatGptSelection');
const { buildBrowserConfig } = await load('cli/browserConfig');
const { resolveBrowserConfig } = await load('browser/config');
const { resolveRunOptionsFromConfig } = await load('cli/runOptions');
const { resolveApiModel, inferModelFromLabel } = await load('cli/options');

test('Chat Astra means Latest + Pro, not a fixed Astra reasoning slider', () => {
  const plan = resolveChatGptSelection({ model: 'gpt-6-astra' });
  assert.equal(plan.surface, 'chat');
  assert.equal(plan.modelLabel, 'Latest');
  assert.equal(plan.level, 'pro');
  assert.throws(() => resolveChatGptSelection({ model: 'gpt-6-astra', thinkingTime: 'xhigh' }), /requires Latest \+ pro/);
  for (const thinkingTime of ['instant', 'medium', 'high', 'xhigh', 'pro']) {
    assert.equal(resolveChatGptSelection({ model: 'gpt-chat-latest', thinkingTime }).level, thinkingTime);
  }
  assert.equal(resolveChatGptSelection({ model: 'gpt-5.6-sol-pro' }).modelLabel, 'GPT-5.6 Sol');
});

test('Work model limits match the observed menus', () => {
  const models = {
    'gpt-6-astra': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    'gpt-5.6-sol': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    'gpt-5.6-terra': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    'gpt-5.6-luna': ['low', 'medium', 'high', 'xhigh', 'max'],
    'gpt-5.5': ['low', 'medium', 'high', 'xhigh'],
  };
  for (const [model, levels] of Object.entries(models)) {
    for (const thinkingTime of levels) {
      const plan = resolveChatGptSelection({ surface: 'work', model, thinkingTime });
      assert.equal(plan.level, thinkingTime);
      assert.deepEqual(levelsForSelection('work', plan.modelLabel), levels);
    }
    for (const thinkingTime of ['instant', 'pro', ...['max', 'ultra'].filter((level) => !levels.includes(level))]) {
      assert.throws(() => resolveChatGptSelection({ surface: 'work', model, thinkingTime }));
    }
  }
});

test('unsupported surfaces and ambiguous combinations stop during preflight', () => {
  for (const model of ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-work-default']) {
    assert.throws(() => resolveChatGptSelection({ surface: 'chat', model }), /not supported/);
  }
  for (const thinkingTime of ['max', 'ultra']) {
    assert.throws(() => resolveChatGptSelection({ model: 'gpt-chat-latest', thinkingTime }), /Unsupported chat/);
  }
  assert.throws(() => resolveChatGptSelection({ surface: 'work', model: 'gpt-work-default', thinkingTime: 'high' }), /changes both model/);
  assert.equal(resolveChatGptSelection({ surface: 'work', model: 'gpt-work-default' }).level, null);
  assert.throws(() => resolveChatGptSelection({ model: 'gpt-chat-latest', thinkingTime: 'high', strategy: 'ignore' }), /cannot be combined/);
  assert.throws(() => resolveChatGptSelection({ model: 'gpt-6-astra', researchMode: 'deep' }), /Deep Research/);
});

test('browser aliases never become API model IDs and provider IDs retain their identity', () => {
  for (const model of ['latest', 'default']) {
    assert.throws(() => resolveApiModel(model), /browser menu targets/);
    const result = resolveRunOptionsFromConfig({ prompt: 'test', model, engine: 'browser', env: {} });
    assert.equal(result.resolvedEngine, 'browser');
  }
  assert.equal(inferModelFromLabel('GPT-5.6 Terra'), 'gpt-5.6-terra');
  assert.equal(inferModelFromLabel('GPT-5.6 Luna'), 'gpt-5.6-luna');
  assert.equal(resolveApiModel('gpt-6-astra'), 'gpt-6-astra');
  assert.equal(resolveApiModel('openai/gpt-6-astra'), 'openai/gpt-6-astra');
});

test('surface and selection plan survive browser configuration normalization', async () => {
  const config = await buildBrowserConfig({ model: 'gpt-6-astra', browserSurface: 'work', browserThinkingTime: 'ultra' });
  const resolved = resolveBrowserConfig(config);
  assert.equal(resolved.surface, 'work');
  assert.equal(resolved.selectionPlan.level, 'ultra');
  assert.equal(resolved.selectionPlan.modelLabel, 'GPT-6 Astra');
});

test('selection evidence rejects mismatched UI state and does not claim backend identity', async () => {
  const plan = resolveChatGptSelection({ model: 'gpt-6-astra' });
  const value = { surface: 'chat', modelLabel: 'Latest', sliderValue: 4, sliderMax: 4, visibleLabel: 'Pro' };
  const runtime = (result) => ({ evaluate: async () => ({ result: { value: result } }) });
  for (const wrong of [{ ...value, surface: 'work' }, { ...value, modelLabel: 'GPT-5.6 Sol' }, { ...value, sliderValue: 3 }]) {
    await assert.rejects(ensureChatGptSelection(runtime(wrong), plan, () => {}), /does not match/);
  }
  const evidence = await ensureChatGptSelection(runtime(value), plan, () => {});
  assert.equal(evidence.verified, true);
  assert.equal(evidence.identityVerified, false);
  assert.equal(evidence.resolvedLevel, 'pro');
});

test('CLI dry-run exposes surface, model menu and effective requested intensity', () => {
  for (const [surface, model, level, expectedLabel] of [
    ['chat', 'latest', 'pro', 'Latest'],
    ['work', 'gpt-6-astra', 'ultra', 'GPT-6 Astra'],
    ['work', 'gpt-5.6-luna', 'max', 'GPT-5.6 Luna'],
  ]) {
    const result = spawnSync(process.execPath, [`${root}/dist/bin/oracle-cli.js`, '--engine', 'browser', '--remote-chrome', '127.0.0.1:9222', '--browser-surface', surface,
      '--model', model, '--browser-thinking-time', level, '--dry-run', 'json', '-p', 'selection preflight'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const payload = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(payload.surface, surface);
    assert.equal(payload.selectionPlan.modelLabel, expectedLabel);
    assert.equal(payload.thinkingTime, level);
  }
  const conflict = spawnSync(process.execPath, [`${root}/dist/bin/oracle-cli.js`, '--engine', 'browser', '--remote-chrome', '127.0.0.1:9222',
    '--remote-host', '127.0.0.1:9474', '--model', 'latest', '--dry-run', 'json', '-p', 'selection preflight'], { encoding: 'utf8' });
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr + conflict.stdout, /cannot be combined/);
});
