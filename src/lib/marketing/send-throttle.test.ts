import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createThrottle } from "./send-throttle";

describe("createThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets the first acquire through immediately", async () => {
    const t = createThrottle({ ratePerSecond: 2 });
    await expect(t.acquire()).resolves.toBeUndefined();
  });

  it("spaces concurrent acquires by the interval", async () => {
    const t = createThrottle({ ratePerSecond: 2 });
    const resolvedAt: number[] = [];
    const start = Date.now();
    const track = () =>
      t.acquire().then(() => {
        resolvedAt.push(Date.now() - start);
      });
    const all = Promise.all([track(), track(), track(), track()]);

    await vi.advanceTimersByTimeAsync(2000);
    await all;
    expect(resolvedAt).toEqual([0, 500, 1000, 1500]);
  });

  it("does not make a caller wait after an idle period", async () => {
    const t = createThrottle({ ratePerSecond: 2 });
    await t.acquire();
    await vi.advanceTimersByTimeAsync(5000);

    let resolved = false;
    void t.acquire().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it("honours a custom rate", async () => {
    const t = createThrottle({ ratePerSecond: 10 });
    await t.acquire();
    let resolved = false;
    void t.acquire().then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  it("rejects a non-positive rate", () => {
    expect(() => createThrottle({ ratePerSecond: 0 })).toThrow();
  });
});
