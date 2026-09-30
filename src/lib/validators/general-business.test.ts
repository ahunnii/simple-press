import { describe, expect, it } from "vitest";

import { generalBusinessFormSchema } from "./general-business";

/**
 * Map-pin (`latitude`/`longitude`) validation on the General Settings form.
 * Both fields are entered as free text so they can be blank; they must be
 * both blank or both a valid, in-range coordinate.
 */
const baseInput = {
  name: "Test Business",
  ownerEmail: "owner@example.com",
  supportEmail: "support@example.com",
  slug: "test-business",
  sendAbandonedCheckoutEmails: false,
  timeZone: "America/Detroit",
};

describe("generalBusinessFormSchema — map pin", () => {
  it("passes when both latitude and longitude are blank", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "",
      longitude: "",
    });
    expect(result.success).toBe(true);
  });

  it("passes when latitude and longitude are omitted entirely", () => {
    const result = generalBusinessFormSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("passes with a valid coordinate pair", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "42.4305",
      longitude: "-83.1419",
    });
    expect(result.success).toBe(true);
  });

  it("fails when only latitude is set, flagging the blank longitude", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "42.4305",
      longitude: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("longitude"),
      );
      expect(issue?.message).toBe(
        "Enter both latitude and longitude, or leave both blank.",
      );
    }
  });

  it("fails when only longitude is set, flagging the blank latitude", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "",
      longitude: "-83.1419",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("latitude"),
      );
      expect(issue?.message).toBe(
        "Enter both latitude and longitude, or leave both blank.",
      );
    }
  });

  it("fails when latitude is out of range", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "142.4305",
      longitude: "-83.1419",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("latitude"),
      );
      expect(issue?.message).toBe("Latitude must be between -90 and 90");
    }
  });

  it("fails when longitude is out of range", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "42.4305",
      longitude: "-183.1419",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("longitude"),
      );
      expect(issue?.message).toBe("Longitude must be between -180 and 180");
    }
  });

  it("fails when latitude is non-numeric", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "not-a-number",
      longitude: "-83.1419",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("latitude"),
      );
      expect(issue?.message).toBe("Latitude must be between -90 and 90");
    }
  });

  it("fails when longitude is non-numeric", () => {
    const result = generalBusinessFormSchema.safeParse({
      ...baseInput,
      latitude: "42.4305",
      longitude: "not-a-number",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("longitude"),
      );
      expect(issue?.message).toBe("Longitude must be between -180 and 180");
    }
  });
});
