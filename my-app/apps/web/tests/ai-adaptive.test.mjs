import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { defaults, validateSettings, saveAiSettings, readAiSettings } from '../src/lib/ai-config.ts';
import { MODEL_CATALOG, recommendations, modelAvailability } from '../src/lib/ai-catalog.ts';
import { contextPlan, estimatedModelGiB } from '../src/lib/ai-context.ts';

const scratch = mkdtempSync(join(tmpdir(), 'butler-adaptive-'));
process.env.BUTLER_AI_DATA_DIR = join(scratch, 'ai');
process.env.BUTLER_MODELS_DIR = join(scratch, 'model-storage');
after(() => {
  const target = resolve(scratch);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.match(basename(target), /^butler-adaptive-/);
  rmSync(target, { recursive: true, force: true });
});

test('model storage follows the configured machine folder instead of the installation path', () => {
  assert.equal(defaults().modelsDir, process.env.BUTLER_MODELS_DIR);
});

test('a selected model can use its supported 16K context instead of a universal 8K ceiling', () => {
  assert.equal(validateSettings({ ...defaults(), modelId: 'gemma4-12-qat', context: 16384 }).context, 16384);
  assert.throws(() => validateSettings({ ...defaults(), modelId: 'qwen3-4-q4', context: 524288 }));
});

test('automatic folders follow this machine after a move; custom and legacy weights stay where the user put them', () => {
  saveAiSettings(defaults());
  process.env.BUTLER_MODELS_DIR = join(scratch, 'second-machine-models');
  assert.equal(readAiSettings().modelsDir, process.env.BUTLER_MODELS_DIR);
  const custom = join(scratch, 'my-existing-models');
  saveAiSettings({ ...defaults(), modelsDir: custom, modelsDirMode: 'custom' });
  assert.equal(readAiSettings().modelsDir, custom);
  const legacy = join(process.env.BUTLER_AI_DATA_DIR, 'models');
  mkdirSync(legacy, { recursive: true });
  const raw = { ...defaults(), modelsDir: legacy }; delete raw.modelsDirMode;
  writeFileSync(join(process.env.BUTLER_AI_DATA_DIR, 'settings.json'), JSON.stringify(raw));
  assert.equal(readAiSettings().modelsDirMode, 'auto');
  writeFileSync(join(legacy, 'user-model.gguf.part'), 'synthetic partial weight');
  assert.equal(readAiSettings().modelsDir, legacy);
  assert.equal(readAiSettings().modelsDirMode, 'custom');
});

test('capability priority beats parameter count; lower eligible models remain available and low hardware recommends API', () => {
  const [gemma,qwen,moe] = MODEL_CATALOG;
  const hardware = { os:'win32',arch:'x64',ramGiB:64,freeRamGiB:48,diskGiB:40,gpus:[],bundledCpu:true,cpu:{name:'Synthetic CPU',logicalCores:8},notes:[] };
  const advice = recommendations(hardware);
  assert.equal(advice.recommendedMode,'local');assert.equal(advice.quality,'qwen38-27-q4');
  assert.ok(qwen.parametersB < moe.parametersB);assert.equal(advice.balanced,'gemma4-12-qat');
  assert.equal(advice.models.filter(m=>m.available).length,3);
  for(const model of MODEL_CATALOG) { assert.ok(model.parametersB>8);assert.ok(model.evidence.evaluation);assert.equal(model.evidence.status,'public-evidence'); }
  assert.equal(recommendations({...hardware,ramGiB:8,freeRamGiB:6}).recommendedMode,'api');
  assert.equal(recommendations({...hardware,ramGiB:16,freeRamGiB:8}).quality,null);
  assert.equal(recommendations({...hardware,cpu:{name:'Slow fixture',logicalCores:2}}).recommendedMode,'api');
  assert.equal(contextPlan(moe,hardware).recommended,131072);assert.ok(!contextPlan(moe,hardware).options.includes(8192));
  assert.equal(contextPlan(gemma,{ramGiB:16,freeRamGiB:12}).recommended,8192);
  assert.ok(estimatedModelGiB(gemma,16384)-estimatedModelGiB(gemma,4096) > estimatedModelGiB(qwen,16384)-estimatedModelGiB(qwen,4096));
  assert.equal(recommendations({...hardware,diskGiB:0}).quality,null);
  assert.equal(modelAvailability(qwen,{...hardware,diskGiB:1.1}).available,false);
  assert.equal(modelAvailability(qwen,{...hardware,diskGiB:1.1,localModelBytes:{[qwen.id]:qwen.bytes}}).available,true);
});
