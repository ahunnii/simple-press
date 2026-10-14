import { afterEach, describe, expect, it, vi } from "vitest";

import {
  callWithinDeadline,
  classifyStripeError,
  createDeadline,
  DeadlineExceededError,
  isDeadlineExceeded,
  MIN_CALL_BUDGET_MS,
} from "./stripe-call-budget";

describe("createDeadline", () => {
  it("counts down from the budget on the injected clock and never goes negative", () => {
    let t = 1_000;
    const deadline = createDeadline(8000, () => t);
    expect(deadline.remainingMs()).toBe(8000);
    t += 3000;
    expect(deadline.remainingMs()).toBe(5000);
    t += 10_000;
    expect(deadline.remainingMs()).toBe(0);
  });
});

describe("callWithinDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes min(per-call timeout, remaining) as an integer timeout", async () => {
    let t = 0;
    const deadline = createDeadline(8000, () => t);
    const call = vi.fn((timeout: number) => Promise.resolve(timeout));

    expect(await callWithinDeadline(deadline, 5000, call)).toBe(5000);
    t = 4999.6;
    expect(await callWithinDeadline(deadline, 5000, call)).toBe(3000);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it(`skips the call (never invokes it) below ${MIN_CALL_BUDGET_MS}ms of budget`, async () => {
    let t = 0;
    const deadline = createDeadline(8000, () => t);
    const call = vi.fn(() => Promise.resolve("ran"));
    t = 8000 - MIN_CALL_BUDGET_MS + 1;
    await expect(callWithinDeadline(deadline, 5000, call)).rejects.toThrow(
      DeadlineExceededError,
    );
    expect(call).not.toHaveBeenCalled();
    // Exactly at the floor it still runs, with that much timeout.
    t = 8000 - MIN_CALL_BUDGET_MS;
    await expect(callWithinDeadline(deadline, 5000, call)).resolves.toBe("ran");
  });

  it("stops waiting at the deadline even if the call never settles (stripe-node retry backoff)", async () => {
    vi.useFakeTimers();
    const deadline = createDeadline(1000);
    const result = callWithinDeadline(
      deadline,
      5000,
      () => new Promise<never>(() => undefined),
    );
    const assertion = expect(result).rejects.toThrow(DeadlineExceededError);
    await vi.advanceTimersByTimeAsync(999);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it("an abandoned call that rejects later is not an unhandled rejection", async () => {
    vi.useFakeTimers();
    const deadline = createDeadline(500);
    let rejectLate: (err: Error) => void = () => undefined;
    const result = callWithinDeadline(
      deadline,
      5000,
      () =>
        new Promise<never>((_, reject) => {
          rejectLate = reject;
        }),
    );
    const assertion = expect(result).rejects.toThrow(DeadlineExceededError);
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    rejectLate(new Error("late"));
    await vi.advanceTimersByTimeAsync(0);
  });

  it("passes a call's own result or error through and clears its timer", async () => {
    vi.useFakeTimers();
    const deadline = createDeadline(8000);
    await expect(
      callWithinDeadline(deadline, 5000, () => Promise.resolve(1)),
    ).resolves.toBe(1);
    const err = Object.assign(new Error("boom"), { type: "StripeAPIError" });
    await expect(
      callWithinDeadline(deadline, 5000, () => Promise.reject(err)),
    ).rejects.toBe(err);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("classifyStripeError", () => {
  it.each([
    ["StripeInvalidRequestError", "invalid"],
    ["StripeConnectionError", "unknown"],
    ["DeadlineExceededError", "unknown"],
    ["StripeAPIError", "failed"],
    ["StripeRateLimitError", "failed"],
    ["StripeIdempotencyError", "failed"],
    ["StripeAuthenticationError", "failed"],
    ["StripePermissionError", "failed"],
    ["StripeUnknownError", "failed"],
  ] as const)("%s → %s", (type, expected) => {
    expect(classifyStripeError(Object.assign(new Error("x"), { type }))).toBe(
      expected,
    );
  });

  it("a budget skip/cut-off and anything that is not a Stripe error are unknown", () => {
    expect(classifyStripeError(new DeadlineExceededError("skipped"))).toBe(
      "unknown",
    );
    expect(classifyStripeError(new Error("socket hang up"))).toBe("unknown");
    expect(classifyStripeError("nope")).toBe("unknown");
    expect(classifyStripeError(null)).toBe("unknown");
  });
});

describe("isDeadlineExceeded", () => {
  it("is true for a real DeadlineExceededError and for a plain object with the same type", () => {
    expect(isDeadlineExceeded(new DeadlineExceededError("cut off"))).toBe(true);
    expect(isDeadlineExceeded({ type: "DeadlineExceededError" })).toBe(true);
  });

  it("is false for other errors and non-objects", () => {
    expect(
      isDeadlineExceeded(
        Object.assign(new Error("x"), { type: "StripeConnectionError" }),
      ),
    ).toBe(false);
    expect(isDeadlineExceeded(new Error("socket hang up"))).toBe(false);
    expect(isDeadlineExceeded(null)).toBe(false);
    expect(isDeadlineExceeded(undefined)).toBe(false);
    expect(isDeadlineExceeded("DeadlineExceededError")).toBe(false);
  });
});
