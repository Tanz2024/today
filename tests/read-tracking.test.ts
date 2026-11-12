import test from "node:test";
import assert from "node:assert/strict";
import {
  DEDUPE_WINDOW_MS,
  MIN_BODY_SCROLL_RATIO,
  MIN_READ_SECONDS,
  MIN_SAMPLE_SIZE_FOR_AVERAGE,
  deriveReadStats,
  formatReadCount,
  isMeaningfulRead,
  isWithinDedupeWindow,
} from "../lib/read-tracking.ts";

test("no read on initial page load (zero time, zero scroll)", () => {
  assert.equal(isMeaningfulRead({ seconds: 0, scrollRatio: 0 }), false);
});

test("no read before the time threshold, even with full scroll", () => {
  assert.equal(isMeaningfulRead({ seconds: MIN_READ_SECONDS - 1, scrollRatio: 1 }), false);
});

test("no read before the scroll-depth threshold, even with plenty of time", () => {
  assert.equal(isMeaningfulRead({ seconds: 120, scrollRatio: MIN_BODY_SCROLL_RATIO - 0.01 }), false);
});

test("read recorded once both thresholds are met", () => {
  assert.equal(isMeaningfulRead({ seconds: MIN_READ_SECONDS, scrollRatio: MIN_BODY_SCROLL_RATIO }), true);
  assert.equal(isMeaningfulRead({ seconds: 45, scrollRatio: 0.6 }), true);
});

test("time alone or scroll alone is never enough", () => {
  assert.equal(isMeaningfulRead({ seconds: 999, scrollRatio: 0 }), false);
  assert.equal(isMeaningfulRead({ seconds: 0, scrollRatio: 1 }), false);
});

test("dedupe blocks a repeat within the window", () => {
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  assert.equal(isWithinDedupeWindow(twoHoursAgo, now), true);
});

test("dedupe allows a read again once the window has passed", () => {
  const now = Date.now();
  const twoDaysAgo = now - 2 * DEDUPE_WINDOW_MS;
  assert.equal(isWithinDedupeWindow(twoDaysAgo, now), false);
});

test("dedupe allows a first-ever read (no prior timestamp)", () => {
  assert.equal(isWithinDedupeWindow(null), false);
  assert.equal(isWithinDedupeWindow(undefined), false);
  assert.equal(isWithinDedupeWindow(Number.NaN), false);
});

test("read count formatting matches the compact display spec", () => {
  assert.equal(formatReadCount(0), "0");
  assert.equal(formatReadCount(1), "1");
  assert.equal(formatReadCount(4), "4");
  assert.equal(formatReadCount(5), "5");
  assert.equal(formatReadCount(12), "12");
  assert.equal(formatReadCount(97), "97");
  assert.equal(formatReadCount(100), "100");
  assert.equal(formatReadCount(842), "842");
  assert.equal(formatReadCount(1200), "1.2K");
  assert.equal(formatReadCount(1248), "1.2K");
  assert.equal(formatReadCount(14800), "14.8K");
  assert.equal(formatReadCount(1_100_000), "1.1M");
});

test("sampleCount is exposed even below the averaging threshold (1-4)", () => {
  for (const sampleCount of [1, 2, 3, 4]) {
    const stats = deriveReadStats(sampleCount, sampleCount * 30);
    assert.equal(stats.sampleCount, sampleCount);
    assert.equal(stats.averageSeconds, null);
  }
});

test("sampleCount is 0 (not hidden) when nothing has been recorded yet", () => {
  const stats = deriveReadStats(0, 0);
  assert.deepEqual(stats, { sampleCount: 0, averageSeconds: null });
});

test("averageSeconds appears once the sample-size threshold is met", () => {
  const stats = deriveReadStats(MIN_SAMPLE_SIZE_FOR_AVERAGE, MIN_SAMPLE_SIZE_FOR_AVERAGE * 40);
  assert.equal(stats.sampleCount, MIN_SAMPLE_SIZE_FOR_AVERAGE);
  assert.equal(stats.averageSeconds, 40);
});
