import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTORY_PRESETS, exportPresetsToJson, validateAndImportPresets } from './presets';

test('FACTORY_PRESETS contains essential presets with valid shaders', () => {
  assert.ok(FACTORY_PRESETS.length >= 5, 'Should have at least 5 factory presets');
  
  for (const preset of FACTORY_PRESETS) {
    assert.ok(preset.id, `Preset ${preset.name} must have an id`);
    assert.ok(preset.name, `Preset ${preset.id} must have a name`);
    assert.ok(preset.fragmentShader.includes('#version 300 es'), `Preset ${preset.id} must be GLSL 3.0 ES`);
    assert.ok(preset.fragmentShader.includes('out vec4 fragColor'), `Preset ${preset.id} must output fragColor`);
    assert.ok(preset.fragmentShader.includes('u_time'), `Preset ${preset.id} must reference u_time`);
    assert.ok(preset.uniforms.speed > 0, `Preset ${preset.id} speed must be > 0`);
  }
});

test('exportPresetsToJson creates valid parseable JSON', () => {
  const json = exportPresetsToJson(FACTORY_PRESETS.slice(0, 2));
  assert.ok(typeof json === 'string');
  const parsed = JSON.parse(json);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, FACTORY_PRESETS[0].id);
});

test('validateAndImportPresets validates required fields', () => {
  assert.throws(() => {
    validateAndImportPresets(JSON.stringify({ notAnArray: true }));
  }, /Preset file must contain a JSON array/);

  assert.throws(() => {
    validateAndImportPresets(JSON.stringify([{ invalid: true }]));
  }, /Invalid preset structure/);
});
