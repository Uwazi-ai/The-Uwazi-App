import { describe, expect, it } from "vitest";
import { applyResult, consumeHint, startAdaptive } from "../systems/adaptive";

const bounds = { min: 1, max: 5 };

describe("adaptive difficulty", () => {
  it("steps up after three correct in a row and resets the run", () => {
    let state = startAdaptive(2);
    state = applyResult(state, true, bounds);
    state = applyResult(state, true, bounds);
    expect(state.level).toBe(2);
    state = applyResult(state, true, bounds);
    expect(state.level).toBe(3);
    expect(state.correctRun).toBe(0);
  });

  it("never passes the maximum level", () => {
    let state = startAdaptive(5);
    for (let i = 0; i < 6; i += 1) state = applyResult(state, true, bounds);
    expect(state.level).toBe(5);
  });

  it("shows a hint and eases after two misses, then eases the level without going below the floor", () => {
    let state = startAdaptive(1);
    state = applyResult(state, false, bounds);
    expect(state.hint).toBe(false);
    state = applyResult(state, false, bounds);
    expect(state.hint).toBe(true);
    expect(state.ease).toBe(true);
    expect(state.hintsShown).toBe(1);
    expect(state.level).toBe(1);
    const higher = applyResult(applyResult(startAdaptive(3), false, bounds), false, bounds);
    expect(higher.level).toBe(2);
  });

  it("a correct answer clears a pending miss run and a miss clears a correct run", () => {
    let state = applyResult(startAdaptive(2), false, bounds);
    state = applyResult(state, true, bounds);
    expect(state.missRun).toBe(0);
    state = applyResult(state, false, bounds);
    expect(state.correctRun).toBe(0);
  });

  it("consumeHint clears the one shot flags only", () => {
    const state = consumeHint({ ...startAdaptive(2), hint: true, ease: true, hintsShown: 2 });
    expect(state.hint).toBe(false);
    expect(state.ease).toBe(false);
    expect(state.hintsShown).toBe(2);
  });
});
