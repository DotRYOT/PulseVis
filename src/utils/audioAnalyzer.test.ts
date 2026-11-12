import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBandEnergies, BeatTracker } from './audioAnalyzer';

test('calculateBandEnergies computes sub-bass, bass, mid, treble, and rms correctly', () => {
  // 512 bins, sample rate 48000, fftSize 1024 -> ~46.875 Hz per bin
  const data = new Uint8Array(512);

  // Fill bin 1 (around 46.875 Hz - SubBass / Bass) with max value 255
  data[1] = 255;
  // Fill bin 2 (around 93.75 Hz - Bass) with max value 255
  data[2] = 255;
  // Fill bin 20 (around 937.5 Hz - Mid) with 128
  data[20] = 128;
  // Fill bin 150 (around 7031 Hz - Treble) with 64
  data[150] = 64;

  const result = calculateBandEnergies(data, 48000, 1024);

  assert.ok(result.subBass > 0, 'Sub-bass energy should be detected');
  assert.ok(result.bass > 0, 'Bass energy should be detected');
  assert.ok(result.mid > 0, 'Mid energy should be detected');
  assert.ok(result.treble > 0, 'Treble energy should be detected');
  assert.ok(result.rms > 0, 'RMS should be greater than zero');
  assert.equal(result.peak, 1.0, 'Peak value should be normalized 1.0');
});

test('calculateBandEnergies returns zero for silent buffer', () => {
  const silent = new Uint8Array(512);
  const result = calculateBandEnergies(silent, 48000, 1024);

  assert.equal(result.subBass, 0);
  assert.equal(result.bass, 0);
  assert.equal(result.mid, 0);
  assert.equal(result.treble, 0);
  assert.equal(result.rms, 0);
  assert.equal(result.peak, 0);
});

test('BeatTracker detects beats on sudden energy surges and throttles fast repeats', () => {
  const tracker = new BeatTracker();

  // Feed baseline low energy
  for (let i = 0; i < 20; i++) {
    const isBeat = tracker.detect(0.1, 1000 + i * 16);
    assert.equal(isBeat, false, 'Baseline quiet sounds should not trigger beat');
  }

  // Large energy surge simulating kick drum
  const beatDetected = tracker.detect(0.95, 1500);
  assert.equal(beatDetected, true, 'Surge above threshold should trigger beat');

  // Immediate subsequent frame should be throttled
  const throttled = tracker.detect(0.95, 1550);
  assert.equal(throttled, false, 'Subsequent frame within interval should be throttled');

  // Frame after minInterval
  const laterBeat = tracker.detect(0.98, 1800);
  assert.equal(laterBeat, true, 'Beat should trigger after minInterval');
});
