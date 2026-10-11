import { describe, expect, it } from "vitest";

import { describeStripeConnectReturn } from "./stripe-connect-return";

describe("describeStripeConnectReturn", () => {
  it("returns null when there is no Stripe result in the URL", () => {
    expect(describeStripeConnectReturn({})).toBeNull();
    expect(
      describeStripeConnectReturn({ stripe: "something-else" }),
    ).toBeNull();
  });

  it("reports success", () => {
    expect(describeStripeConnectReturn({ stripe: "connected" })).toEqual({
      kind: "success",
      message: "Stripe connected",
    });
  });

  it("treats access_denied as a neutral cancel", () => {
    expect(
      describeStripeConnectReturn({
        stripeError: "access_denied",
        stripeErrorDescription: "The user denied your request",
      }),
    ).toEqual({ kind: "info", message: "Stripe connection cancelled" });
  });

  it("maps the callback's own error codes to friendly errors", () => {
    expect(describeStripeConnectReturn({ stripeError: "no_code" })?.kind).toBe(
      "error",
    );
    const failed = describeStripeConnectReturn({
      stripeError: "connection_failed",
      stripeErrorDescription: "connection_failed",
    });
    expect(failed?.kind).toBe("error");
    expect(failed?.description).toBeUndefined();
  });

  it("shows other OAuth descriptions as capped plain text", () => {
    const result = describeStripeConnectReturn({
      stripeError: "invalid_scope",
      stripeErrorDescription: "x".repeat(500),
    });
    expect(result?.kind).toBe("error");
    expect(result?.description).toHaveLength(200);
  });

  it("prefers an error over a success flag", () => {
    expect(
      describeStripeConnectReturn({
        stripe: "connected",
        stripeError: "access_denied",
      })?.kind,
    ).toBe("info");
  });
});
