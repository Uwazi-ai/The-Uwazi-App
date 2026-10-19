import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompassDemo } from "@/hooks/useCompassDemo";
import { demoQueueKey, demoRunKey } from "@/lib/compassDemo";

describe("Compass kiosk network failures", () => {
  beforeEach(() => {
    sessionStorage.clear(); localStorage.clear();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-19T13:00:00Z"));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("finishes offline, retries only anonymous totals, then clears the student", async () => {
    const { result, unmount } = renderHook(() => useCompassDemo("expo-oct-19"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.setRun(run => ({ ...run, stage: "budget", answers: Object.fromEntries((result.current.catalog?.questions ?? []).map(q => [q.id, 4])) })));
    await act(async () => { await result.current.finish(); });
    expect(result.current.run.result?.labels.persona).toBe("steward");
    await waitFor(() => expect(sessionStorage.getItem(demoQueueKey("expo-oct-19"))).not.toBeNull());
    const pending = JSON.parse(sessionStorage.getItem(demoQueueKey("expo-oct-19")) ?? "{}");
    expect(Object.keys(pending).sort()).toEqual(["p_completion_id", "p_duration", "p_event_slug", "p_persona_key", "p_top_issues"]);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(pending.p_completion_id), { status: 200 }));
    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(result.current.run.logged).toBe(true));
    expect(sessionStorage.getItem(demoQueueKey("expo-oct-19"))).toBeNull();
    act(() => result.current.nextStudent());
    expect(result.current.run.answers).toEqual({});
    expect(result.current.run.result).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(demoRunKey("expo-oct-19")) ?? "{}").answers).toEqual({});
    expect(localStorage.length).toBe(0);
    unmount();
  });
  it("never substitutes offline content when the server says the event is inactive", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("[]", { status: 200 }));
    const { result } = renderHook(() => useCompassDemo("expo-oct-19"));
    await waitFor(() => expect(result.current.status).toBe("inactive"));
    expect(result.current.catalog).toBeNull();
  });
  it("refuses an offline event after its approved window", async () => {
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-10-20T04:59:00Z"));
    const { result } = renderHook(() => useCompassDemo("expo-oct-19"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.catalog).toBeNull();
  });
});