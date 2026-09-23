import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = process.env.ORACLE_PACKAGE_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const load = (relative) => import(pathToFileURL(`${root}/dist/src/${relative}.js`));
const options = await load('cli/options');
const browser = await load('cli/browserConfig');
const { resolveRunOptionsFromConfig } = await load('cli/runOptions');
const { resolveProviderRoutingState } = await load('oracle/providerRouting');
const { resolveModelConfig, applyModelOverride } = await load('oracle/modelResolver');
const { buildRequestBody } = await load('oracle/request');
const selection = await load('browser/actions/modelSelection');

test('GPT-6 aliases resolve consistently across engines', () => {
  for (const model of ['gpt-6', 'gpt-6-astra', 'GPT-6 Astra', 'ChatGPT 6 Astra']) {
    for (const engine of ['browser', 'api']) {
      const { runOptions } = resolveRunOptionsFromConfig({ prompt: 'test', model, engine, env: {} });
      assert.equal(runOptions.model, 'gpt-6-astra');
      assert.equal(resolveProviderRoutingState({ model: runOptions.model }).provider, 'openai');
    }
  }
  assert.equal(browser.mapModelToBrowserLabel('gpt-6-astra'), 'GPT-6 Astra');
});

test('unknown browser variants fail instead of downgrading; API IDs pass through', () => {
  for (const model of ['gpt-6-terra', 'gpt-6-pro', 'gpt-6-astra-pro', 'gpt-6-sol-pro', 'gpt-6.1']) {
    assert.throws(() => options.inferModelFromLabel(model), /Unknown GPT-6/);
    assert.equal(options.resolveApiModel(model), model);
  }
  assert.equal(options.resolveApiModel('openai/gpt-6-astra'), 'openai/gpt-6-astra');
  assert.equal(options.inferModelFromLabel('gpt-5.6-sol'), 'gpt-5.6-sol');
  assert.equal(options.resolveApiModel('gpt-5.5-pro'), 'gpt-5.5-pro');
});

test('new GPT-6 Work models keep their identity through CLI normalization', async () => {
  for (const variant of ['sol', 'luna']) {
    const model = `gpt-6-${variant}`;
    const label = `GPT-6 ${variant[0].toUpperCase()}${variant.slice(1)}`;
    for (const alias of [model, label, label.replace('GPT-', 'ChatGPT ')]) {
      assert.equal(options.inferModelFromLabel(alias), model);
      for (const engine of ['browser', 'api']) {
        const result = resolveRunOptionsFromConfig({ prompt: 'test', model: alias, engine, env: {} });
        assert.equal(result.runOptions.model, model);
        assert.equal(result.resolvedEngine, engine);
      }
    }
    assert.equal(browser.mapModelToBrowserLabel(model), label);
    const config = await browser.buildBrowserConfig({ model, browserSurface: 'work', browserThinkingTime: 'max' });
    assert.equal(config.selectionPlan.modelLabel, label);
    assert.equal(config.selectionPlan.level, 'max');
    assert.equal(options.resolveApiModel(`openai/${model}`), `openai/${model}`);
  }
});

test('Astra request uses documented model, effort and search tool', async () => {
  const modelConfig = await resolveModelConfig('gpt-6-astra');
  const body = buildRequestBody({ modelConfig, systemPrompt: 'test', userPrompt: 'test', searchEnabled: true });
  assert.equal(body.model, 'gpt-6-astra');
  assert.equal(body.reasoning.effort, 'xhigh');
  assert.deepEqual(body.tools, [{ type: 'web_search' }]);
  for (const field of ['temperature', 'top_p', 'top_logprobs', 'prompt_cache_retention']) {
    assert.equal(Object.hasOwn(body, field), false);
  }
  assert.equal(modelConfig.pricing, null);
  assert.equal(applyModelOverride(modelConfig, 'gpt-6-astra', {
    'gpt-6-astra': { reasoning: { effort: 'max' } },
  }).reasoning.effort, 'max');
});

test('picker evidence rejects old models, missing labels and Pro', async () => {
  for (const label of ['GPT-5.6 Sol', 'GPT-5.2', 'Pro', '', 'GPT-6 Astra Pro']) {
    const runtime = { evaluate: async () => ({ result: { value: { status: 'switched', label } } }) };
    await assert.rejects(selection.ensureModelSelection(runtime, 'GPT-6 Astra', () => {}), /requires GPT-6 Astra/);
  }
  const runtime = { evaluate: async () => ({ result: { value: { status: 'switched', label: 'GPT-6 Astra' } } }) };
  const evidence = await selection.ensureModelSelection(runtime, 'GPT-6 Astra', () => {});
  assert.equal(evidence.verified, true);
  assert.equal(evidence.resolvedLabel, 'GPT-6 Astra');
});

test('generated browser expressions compile and handle missing picker', () => {
  for (const model of ['GPT-6 Astra', 'GPT-5.6 Sol', 'Pro']) {
    const expression = selection.buildModelSelectionExpressionForTest(model);
    const result = new vm.Script(expression).runInNewContext({
      document: { querySelector: () => null, querySelectorAll: () => [] },
    });
    assert.equal(result.status, 'button-missing');
  }
  const signals = selection.buildComposerSignalMatchersForTest('GPT-6 Astra');
  assert.equal(signals.allowBlank, false);
  assert.deepEqual(signals.excludesAny, ['pro']);
});
