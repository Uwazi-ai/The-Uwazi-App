import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreAnswers } from "@/lib/compassScoring";
import { clearDemoRun, completionFor, demoQueueKey, demoRunKey, newDemoRun, storeDemoRun } from "@/lib/compassDemo";

describe("Compass demo privacy and existing scoring", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  it("keeps existing weighted, reverse-scored three-decimal math", () => {
    const scores = scoreAnswers([{ id: "a", dimension_id: "d", prompt_text: "", weight: 2, reverse_scored: false }, { id: "b", dimension_id: "d", prompt_text: "", weight: 1, reverse_scored: true }], [{ id: "d", slug: "schools", name: "Schools" }], { a: 5, b: 5 });
    expect(scores.schools).toBe(0.667);
  });
  it("stores state only in sessionStorage without a normal-route unlock flag", () => {
    storeDemoRun("expo-oct-19", newDemoRun());
    expect(sessionStorage.getItem(demoRunKey("expo-oct-19"))).not.toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it("drops previous student state and queued completion on reset", () => {
    storeDemoRun("expo-oct-19", newDemoRun());
    sessionStorage.setItem(demoQueueKey("expo-oct-19"), "pending");
    clearDemoRun("expo-oct-19");
    expect(sessionStorage.getItem(demoRunKey("expo-oct-19"))).toBeNull();
    expect(sessionStorage.getItem(demoQueueKey("expo-oct-19"))).toBeNull();
  });
  it("completion payload contains only requested non-identifying results and one-run deduplication id", () => {
    const run = newDemoRun(); run.answers = { sensitive: 5 };
    run.result = { scores: { schools: 1 }, labels: { persona: "mentor", streak: null, primary: "Schools first" }, top: ["education-youth"], duration: 45, id: "one-run-id" };
    expect(completionFor("expo-oct-19", run)).toEqual({ p_event_slug: "expo-oct-19", p_persona_key: "mentor", p_top_issues: ["education-youth"], p_duration: 45, p_completion_id: "one-run-id" });
  });
});