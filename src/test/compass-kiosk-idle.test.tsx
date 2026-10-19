import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompassKioskIdle } from "@/hooks/useCompassKioskIdle";

describe("Compass kiosk privacy resets", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it("warns at 90 seconds on results and resets after the 10 second countdown", () => {
    const reset = vi.fn();
    const { result } = renderHook(() => useCompassKioskIdle("result", reset));
    act(() => { vi.advanceTimersByTime(89750); });
    expect(result.current).toBeNull();
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current).toBe(10);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(reset).toHaveBeenCalledTimes(1);
  });
  it("warns after 3 minutes mid-quiz", () => {
    const reset = vi.fn();
    const { result } = renderHook(() => useCompassKioskIdle("quiz", reset));
    act(() => { vi.advanceTimersByTime(179750); });
    expect(result.current).toBeNull();
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current).toBe(10);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(reset).toHaveBeenCalledOnce();
  });
  it("any tap cancels countdown and restarts inactivity timing", () => {
    const reset = vi.fn();
    const { result } = renderHook(() => useCompassKioskIdle("result", reset));
    act(() => { vi.advanceTimersByTime(95000); });
    expect(result.current).toBe(5);
    act(() => { window.dispatchEvent(new Event("pointerdown")); });
    expect(result.current).toBeNull();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(reset).not.toHaveBeenCalled();
  });
  it("welcome never resets or reopens prior results", () => {
    const reset = vi.fn();
    const { result } = renderHook(() => useCompassKioskIdle("intro", reset));
    act(() => { vi.advanceTimersByTime(300000); });
    expect(result.current).toBeNull();
    expect(reset).not.toHaveBeenCalled();
  });
});