import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useThrottledCallback } from "./useThrottledCallback";

describe("useThrottledCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes callback immediately on first call", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 100));

    act(() => {
      result.current("a");
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("defers second call within throttle window", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 100));

    act(() => {
      result.current("a");
    });
    act(() => {
      result.current("b");
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("fires deferred call after delay elapses", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 100));

    act(() => {
      result.current("a");
    });
    act(() => {
      result.current("b");
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("only schedules one deferred call (last wins)", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 100));

    act(() => {
      result.current("a");
    });
    act(() => {
      result.current("b");
    });
    act(() => {
      result.current("c");
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, "a");
    expect(fn).toHaveBeenNthCalledWith(2, "b");
  });

  it("allows immediate execution after throttle window resets", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 100));

    act(() => {
      result.current("a");
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current("b");
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });
});
