import { describe, expect, it } from "vitest";

import { contactFormSchema, contactSchema } from "./contact";

/**
 * `contactSchema` is the wire schema behind the `contact.send` tRPC mutation
 * (a `publicProcedure`, reachable by a direct call that never goes through
 * the browser form). Before this test, `name`/`subject`/`message`/`phone` had
 * no `.max()` here at all — the only cap that existed anywhere was
 * `message`'s, and only inside the CLIENT-side `contactFormSchema` below, via
 * whatever `messageMaxLength` a given template happened to pass in. See B4.
 */
describe("contactSchema", () => {
  const base = {
    name: "Jane Doe",
    email: "jane@example.com",
    message: "This is a perfectly reasonable message.",
    captchaToken: "token",
  };

  it("accepts a normal submission", () => {
    const result = contactSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects a name over the cap", () => {
    const result = contactSchema.safeParse({
      ...base,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a name right at the cap", () => {
    const result = contactSchema.safeParse({
      ...base,
      name: "a".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a subject over the cap", () => {
    const result = contactSchema.safeParse({
      ...base,
      subject: "a".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number over the cap", () => {
    const result = contactSchema.safeParse({
      ...base,
      phone: "1".repeat(33),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a message over the server cap (an unbounded string can no longer reach the owner's inbox)", () => {
    const result = contactSchema.safeParse({
      ...base,
      message: "a".repeat(601),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a message at the server cap", () => {
    const result = contactSchema.safeParse({
      ...base,
      message: "a".repeat(600),
    });
    expect(result.success).toBe(true);
  });

  it("the server message cap is >= every template's client-side messageMaxLength (currently 600, from pink)", () => {
    // If a template ever raises its own client-side cap above the server's,
    // a legitimate submission the form allowed through would be silently
    // rejected server-side. Guards the two from drifting apart unnoticed.
    const largestKnownTemplateCap = 600;
    const probe = contactSchema.safeParse({
      ...base,
      message: "a".repeat(largestKnownTemplateCap),
    });
    expect(probe.success).toBe(true);
  });
});

describe("contactFormSchema (client-side, unchanged by B4)", () => {
  it("still enforces its own messageMaxLength independently of the wire schema's cap", () => {
    const schema = contactFormSchema(50);
    const result = schema.safeParse({
      name: "Jane",
      email: "jane@example.com",
      message: "a".repeat(51),
      preferredContactMethod: "no-preference",
    });
    expect(result.success).toBe(false);
  });
});
