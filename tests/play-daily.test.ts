import test from "node:test";
import assert from "node:assert/strict";
import { dailyTarget, dayKey, readStreak, recordDailyResult, recordPlayDay } from "../lib/play/daily.ts";

function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

test("daily targets are stable for a day and within range", () => {
  assert.deepEqual(dailyTarget("rush", "2026-09-26"), dailyTarget("rush", "2026-09-26"));
  for (const day of ["2026-01-01", "2026-06-15", "2026-12-31"]) {
    const { value } = dailyTarget("breaker", day);
    assert.ok(value >= 200 && value <= 700 && value % 50 === 0);
  }
});

test("day keys use the local calendar", () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
});

test("streak grows on consecutive days, ignores repeat plays and resets after a gap", () => {
  const store = storage();
  assert.equal(recordPlayDay(store, "2026-09-24").current, 1);
  assert.equal(recordPlayDay(store, "2026-09-24").current, 1);
  assert.equal(recordPlayDay(store, "2026-09-25").current, 2);
  assert.equal(readStreak(store, "2026-09-26").current, 2);
  assert.equal(readStreak(store, "2026-09-28").current, 0);
  const next = recordPlayDay(store, "2026-09-28");
  assert.equal(next.current, 1);
  assert.equal(next.best, 2);
});

test("streak crosses month boundaries", () => {
  const store = storage();
  recordPlayDay(store, "2026-09-30");
  assert.equal(recordPlayDay(store, "2026-10-01").current, 2);
});

test("a daily target stays hit for the rest of the day", () => {
  const store = storage();
  const day = "2026-09-26";
  const { value } = dailyTarget("obby", day);
  assert.equal(recordDailyResult(store, "obby", value - 10, day).hit, false);
  assert.equal(recordDailyResult(store, "obby", value - 10, day).remaining, 10);
  assert.equal(recordDailyResult(store, "obby", value, day).hit, true);
  assert.equal(recordDailyResult(store, "obby", 0, day).hit, true);
  assert.equal(recordDailyResult(store, "obby", 0, "2026-09-27").hit, false);
});

test("broken storage never throws", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readStreak(broken).current, 0);
  assert.equal(recordPlayDay(broken, "2026-09-26").current, 1);
  assert.equal(recordDailyResult(broken, "rush", 10_000, "2026-09-26").hit, true);
});
