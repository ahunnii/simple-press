import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isRetryableResendError,
  sendResendBatch,
  sendResendEmail,
} from "./resend";

const mocks = vi.hoisted(() => ({
  batchSend: vi.fn(),
  emailsSend: vi.fn(),
  env: {
    RESEND_API_KEY: "re_test",
    IS_PREVIEW_ENV: false as boolean,
    EMAIL_REDIRECT_TO: undefined as string | undefined,
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    batch = { send: mocks.batchSend };
    emails = { send: mocks.emailsSend };
  },
}));
vi.mock("~/env", () => ({ env: mocks.env }));

const emails = [0, 1, 2].map((i) => ({
  from: "a@b.test",
  to: `u${i}@x.test`,
  subject: "s",
  html: "<p>x</p>",
}));
const opts = { idempotencyKey: "mkt:c1:0" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.IS_PREVIEW_ENV = false;
  mocks.env.EMAIL_REDIRECT_TO = undefined;
});

describe("sendResendBatch", () => {
  it("sends permissive with the idempotency key and aligns ids", async () => {
    mocks.batchSend.mockResolvedValue({
      data: {
        data: [{ id: "id0" }, { id: "id2" }],
        errors: [{ index: 1, message: "bad to" }],
      },
      error: null,
      headers: null,
    });
    const r = await sendResendBatch(emails, opts);
    expect(mocks.batchSend).toHaveBeenCalledWith(emails, {
      idempotencyKey: "mkt:c1:0",
      batchValidation: "permissive",
    });
    expect(r).toEqual({
      data: [{ id: "id0" }, null, { id: "id2" }],
      errors: [{ index: 1, message: "bad to" }],
      error: null,
    });
  });

  it("returns API errors without throwing, preserving name and status", async () => {
    mocks.batchSend.mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded", statusCode: 429, message: "slow" },
      headers: null,
    });
    const r = await sendResendBatch(emails, opts);
    expect(r.data).toBeNull();
    expect(r.error).toEqual({
      name: "rate_limit_exceeded",
      statusCode: 429,
      message: "slow",
    });
  });

  it("turns a thrown exception into a retryable synthetic error", async () => {
    mocks.batchSend.mockRejectedValue(new Error("boom"));
    const r = await sendResendBatch(emails, opts);
    expect(r.error).toMatchObject({
      name: "application_error",
      statusCode: null,
      message: "boom",
    });
    expect(isRetryableResendError(r.error!)).toBe(true);
  });

  it("reports a timeout as retryable", async () => {
    vi.useFakeTimers();
    mocks.batchSend.mockReturnValue(new Promise(() => undefined));
    const p = sendResendBatch(emails, { ...opts, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const r = await p;
    vi.useRealTimers();
    expect(r.error?.timedOut).toBe(true);
    expect(isRetryableResendError(r.error!)).toBe(true);
  });

  it("sends nothing on preview env without a redirect", async () => {
    mocks.env.IS_PREVIEW_ENV = true;
    const r = await sendResendBatch(emails, opts);
    expect(mocks.batchSend).not.toHaveBeenCalled();
    expect(mocks.emailsSend).not.toHaveBeenCalled();
    expect(r).toEqual({ data: [null, null, null], errors: [], error: null });
  });

  it("sends only the first email, redirected, on preview env", async () => {
    mocks.env.IS_PREVIEW_ENV = true;
    mocks.env.EMAIL_REDIRECT_TO = "qa@x.test";
    mocks.emailsSend.mockResolvedValue({ data: { id: "one" }, error: null });
    const r = await sendResendBatch(emails, opts);
    expect(mocks.batchSend).not.toHaveBeenCalled();
    expect(mocks.emailsSend).toHaveBeenCalledTimes(1);
    expect(mocks.emailsSend.mock.calls[0]![0]).toMatchObject({
      to: "qa@x.test",
    });
    expect(r).toEqual({
      data: [{ id: "one" }, null, null],
      errors: [],
      error: null,
    });
  });
});

describe("isRetryableResendError", () => {
  const e = (name: string, statusCode: number | null) => ({
    name,
    statusCode,
    message: "",
  });
  it("classifies", () => {
    expect(isRetryableResendError(e("rate_limit_exceeded", 429))).toBe(true);
    expect(
      isRetryableResendError(e("concurrent_idempotent_requests", 409)),
    ).toBe(true);
    expect(isRetryableResendError(e("internal_server_error", 500))).toBe(true);
    expect(isRetryableResendError(e("application_error", null))).toBe(true);
    expect(isRetryableResendError(e("invalid_idempotent_request", 409))).toBe(
      false,
    );
    expect(isRetryableResendError(e("validation_error", 422))).toBe(false);
    expect(isRetryableResendError(e("invalid_api_key", 403))).toBe(false);
    expect(isRetryableResendError(e("daily_quota_exceeded", 429))).toBe(false);
  });
});

describe("sendResendEmail rate-limit retry", () => {
  const payload = {
    from: "a@b.test",
    to: "u@x.test",
    subject: "s",
    html: "<p>x</p>",
  };
  const rateLimited = {
    data: null,
    error: { name: "rate_limit_exceeded", statusCode: 429, message: "slow" },
  };
  const ok = { data: { id: "em_1" }, error: null };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries a 429 after 1s then 2s with the same payload and options", async () => {
    mocks.emailsSend
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(ok);
    const options = { idempotencyKey: "order:1" };

    const p = sendResendEmail(payload, options);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.emailsSend).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(mocks.emailsSend).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.emailsSend).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(mocks.emailsSend).toHaveBeenCalledTimes(3);

    expect(await p).toEqual(ok);
    for (const call of mocks.emailsSend.mock.calls) {
      expect(call).toEqual([payload, options]);
    }
  });

  it("gives up after two retries and returns the last error", async () => {
    mocks.emailsSend.mockResolvedValue(rateLimited);
    const p = sendResendEmail(payload);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await p).toEqual(rateLimited);
    expect(mocks.emailsSend).toHaveBeenCalledTimes(3);
  });

  it("does not retry a daily / monthly quota or any other error", async () => {
    for (const name of [
      "daily_quota_exceeded",
      "monthly_quota_exceeded",
      "validation_error",
    ]) {
      mocks.emailsSend.mockReset().mockResolvedValue({
        data: null,
        error: { name, statusCode: name === "validation_error" ? 422 : 429 },
      });
      const p = sendResendEmail(payload);
      await vi.advanceTimersByTimeAsync(5_000);
      await p;
      expect(mocks.emailsSend).toHaveBeenCalledTimes(1);
    }
  });

  it("does not retry a success", async () => {
    mocks.emailsSend.mockResolvedValue(ok);
    expect(await sendResendEmail(payload)).toEqual(ok);
    expect(mocks.emailsSend).toHaveBeenCalledTimes(1);
  });
});
