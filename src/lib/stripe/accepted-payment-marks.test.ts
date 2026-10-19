import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();

vi.mock("~/lib/stripe/client", () => ({
  stripeClient: { paymentMethodConfigurations: { list: listMock } },
}));
vi.mock("~/env", () => ({
  env: { NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID: "ca_ours" },
}));
vi.mock("~/server/db", () => ({ db: { business: { findUnique: vi.fn() } } }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
// Pass-through: every call hits the (mocked) Stripe client.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const {
  getAcceptedPaymentMarks,
  marksFromConfiguration,
  pickDefaultConfiguration,
} = await import("./accepted-payment-marks");

const on = { available: true, display_preference: { value: "on" } };
const off = { available: false, display_preference: { value: "off" } };
/** Preference on, but the capability isn't active (Stripe says unavailable). */
const onButUnavailable = {
  available: false,
  display_preference: { value: "on" },
};

function config(
  overrides: Record<string, unknown>,
): Stripe.PaymentMethodConfiguration {
  return {
    id: "pmc_1",
    object: "payment_method_configuration",
    active: true,
    application: null,
    is_default: true,
    livemode: false,
    name: "Default",
    parent: null,
    ...overrides,
  } as unknown as Stripe.PaymentMethodConfiguration;
}

describe("marksFromConfiguration", () => {
  it("fans card out to the four card brands", () => {
    expect(marksFromConfiguration({ card: on })).toEqual([
      "visa",
      "mastercard",
      "amex",
      "discover",
    ]);
  });

  it("drops methods that are off or unavailable", () => {
    expect(
      marksFromConfiguration({
        card: onButUnavailable,
        apple_pay: off,
        klarna: on,
        paypal: { available: true, display_preference: { value: "off" } },
      }),
    ).toEqual(["klarna"]);
  });

  it("ignores keys it has no logo for and missing keys", () => {
    expect(marksFromConfiguration({ ideal: on, alipay: on, link: on })).toEqual(
      ["link"],
    );
    expect(marksFromConfiguration({})).toEqual([]);
    expect(marksFromConfiguration(null)).toEqual([]);
  });

  it("keeps a stable order regardless of key order", () => {
    expect(
      marksFromConfiguration({
        us_bank_account: on,
        amazon_pay: on,
        cashapp: on,
        afterpay_clearpay: on,
        affirm: on,
        klarna: on,
        paypal: on,
        link: on,
        google_pay: on,
        apple_pay: on,
        card: on,
      }),
    ).toEqual([
      "visa",
      "mastercard",
      "amex",
      "discover",
      "apple_pay",
      "google_pay",
      "link",
      "paypal",
      "klarna",
      "affirm",
      "afterpay_clearpay",
      "cashapp",
      "amazon_pay",
      "us_bank_account",
    ]);
  });
});

describe("pickDefaultConfiguration", () => {
  it("ignores non-default and inactive configurations", () => {
    const a = config({ id: "a", is_default: false });
    const b = config({ id: "b", active: false });
    const c = config({ id: "c" });
    expect(pickDefaultConfiguration([a, b, c])?.id).toBe("c");
    expect(pickDefaultConfiguration([a, b])).toBeNull();
  });

  it("prefers our platform's child, then the account's own", () => {
    const other = config({ id: "other", application: "ca_other" });
    const own = config({ id: "own" });
    const ours = config({ id: "ours", application: "ca_ours" });
    expect(pickDefaultConfiguration([other, own, ours], "ca_ours")?.id).toBe(
      "ours",
    );
    expect(pickDefaultConfiguration([other, own], "ca_ours")?.id).toBe("own");
    expect(pickDefaultConfiguration([other], "ca_ours")?.id).toBe("other");
  });
});

describe("getAcceptedPaymentMarks", () => {
  beforeEach(() => {
    listMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns [] without calling Stripe when there is no account", async () => {
    expect(await getAcceptedPaymentMarks(null)).toEqual([]);
    expect(await getAcceptedPaymentMarks(undefined)).toEqual([]);
    expect(await getAcceptedPaymentMarks("  ")).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("reads the account's default configuration", async () => {
    listMock.mockResolvedValue({
      data: [
        config({ id: "old", is_default: false, card: on, klarna: on }),
        config({ id: "default", card: on, apple_pay: on, klarna: off }),
      ],
    });
    expect(await getAcceptedPaymentMarks("acct_1")).toEqual([
      "visa",
      "mastercard",
      "amex",
      "discover",
      "apple_pay",
    ]);
    expect(listMock).toHaveBeenCalledWith(
      { limit: 100 },
      expect.objectContaining({ stripeAccount: "acct_1" }),
    );
  });

  it("returns [] (never throws) when Stripe fails", async () => {
    listMock.mockRejectedValue(new Error("stripe down"));
    await expect(getAcceptedPaymentMarks("acct_1")).resolves.toEqual([]);
  });

  it("returns [] when the account has no default configuration", async () => {
    listMock.mockResolvedValue({ data: [] });
    expect(await getAcceptedPaymentMarks("acct_1")).toEqual([]);
  });
});
