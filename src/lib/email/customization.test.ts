import { describe, expect, it } from "vitest";

import {
  applySubjectTemplate,
  emailOverrideSchema,
  emailOverridesSchema,
} from "./customization";

describe("emailOverrideSchema", () => {
  it("accepts a valid override", () => {
    const result = emailOverrideSchema.safeParse({
      subject: "Your order #{orderNumber} shipped",
      introText: "Thanks for shopping with us!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (both fields optional)", () => {
    expect(emailOverrideSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a subject containing HTML tags", () => {
    const result = emailOverrideSchema.safeParse({
      subject: "Hello <b>there</b>",
    });
    expect(result.success).toBe(false);
  });

  it("rejects introText containing a script tag", () => {
    const result = emailOverrideSchema.safeParse({
      introText: "<script>alert(1)</script>",
    });
    expect(result.success).toBe(false);
  });

  it("enforces max length on subject (150 chars)", () => {
    const tooLong = "a".repeat(151);
    expect(emailOverrideSchema.safeParse({ subject: tooLong }).success).toBe(
      false,
    );
    const justRight = "a".repeat(150);
    expect(
      emailOverrideSchema.safeParse({ subject: justRight }).success,
    ).toBe(true);
  });

  it("enforces max length on introText (1000 chars)", () => {
    const tooLong = "a".repeat(1001);
    expect(
      emailOverrideSchema.safeParse({ introText: tooLong }).success,
    ).toBe(false);
  });
});

describe("emailOverridesSchema", () => {
  it("accepts a record keyed by known template ids", () => {
    const result = emailOverridesSchema.safeParse({
      "order-confirmation": { subject: "Order confirmed!" },
      "order-shipped": { introText: "It's on the way." },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown template id key", () => {
    const result = emailOverridesSchema.safeParse({
      "totally-made-up-template": { subject: "Hi" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty object", () => {
    expect(emailOverridesSchema.safeParse({}).success).toBe(true);
  });
});

describe("applySubjectTemplate", () => {
  it("replaces {orderNumber} and {businessName} tokens", () => {
    expect(
      applySubjectTemplate("Order #{orderNumber} Confirmed at {businessName}", {
        orderNumber: 1042,
        businessName: "Acme Co",
      }),
    ).toBe("Order #1042 Confirmed at Acme Co");
  });

  it("replaces a missing orderNumber with an empty string", () => {
    expect(
      applySubjectTemplate("Order #{orderNumber} Confirmed", {
        businessName: "Acme Co",
      }),
    ).toBe("Order # Confirmed");
  });

  it("replaces a missing businessName with an empty string", () => {
    expect(
      applySubjectTemplate("Welcome to {businessName}", {
        orderNumber: 1,
      }),
    ).toBe("Welcome to ");
  });

  it("replaces multiple occurrences of the same token", () => {
    expect(
      applySubjectTemplate("{orderNumber}-{orderNumber}", {
        orderNumber: "A1",
      }),
    ).toBe("A1-A1");
  });
});
