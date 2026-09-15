import { describe, expect, it } from "vitest";

import {
  FREE_TEMPLATE_IDS,
  onboardingDraftSchema,
  onboardingRequestSchema,
  primaryColorSchema,
} from "./onboarding";

// A non-free (commercial, client-owned) template id from
// COMMERCIAL_TEMPLATE_OWNERSHIP in ~/lib/template-ownership — used to prove
// the enum actually excludes commercial templates, not just typos.
const COMMERCIAL_TEMPLATE_ID = "vii";

function validBody() {
  return {
    email: "owner@example.com",
    password: "correct-horse-battery-staple",
    name: "Jane Owner",
    businessName: "Jane's Shop",
    subdomain: "janes-shop",
    customDomain: "janesshop.com",
    templateId: "modern",
    heroTitle: "Welcome",
    heroSubtitle: "Fresh goods daily",
    aboutText: "We sell things.",
    primaryColor: "#3b82f6",
    invitationCode: "letmein",
    aftoken: undefined,
    acceptedTerms: true,
  };
}

describe("FREE_TEMPLATE_IDS", () => {
  it("excludes commercial template ids", () => {
    expect(FREE_TEMPLATE_IDS).not.toContain(COMMERCIAL_TEMPLATE_ID);
  });
});

describe("primaryColorSchema", () => {
  it("accepts a hex color", () => {
    expect(primaryColorSchema.safeParse("#3b82f6").success).toBe(true);
  });

  it("accepts a short hex color", () => {
    expect(primaryColorSchema.safeParse("#fff").success).toBe(true);
  });

  it("accepts a named color", () => {
    expect(primaryColorSchema.safeParse("steelblue").success).toBe(true);
  });

  it("accepts an rgb() function", () => {
    expect(primaryColorSchema.safeParse("rgb(59, 130, 246)").success).toBe(
      true,
    );
  });

  it("accepts an oklch() function", () => {
    expect(primaryColorSchema.safeParse("oklch(0.84 0.04 72)").success).toBe(
      true,
    );
  });

  it("rejects a CSS-injection attempt using a semicolon and parens", () => {
    const result = primaryColorSchema.safeParse("red; background:url(x)");
    expect(result.success).toBe(false);
  });

  it("rejects an attempt to break out via angle brackets", () => {
    const result = primaryColorSchema.safeParse("red</style><script>");
    expect(result.success).toBe(false);
  });

  it("rejects a disguised non-function value containing parens", () => {
    const result = primaryColorSchema.safeParse("evil(){}</script>");
    expect(result.success).toBe(false);
  });

  it("rejects a value over 32 characters", () => {
    const result = primaryColorSchema.safeParse("a".repeat(33));
    expect(result.success).toBe(false);
  });
});

describe("onboardingRequestSchema", () => {
  it("accepts a full valid body", () => {
    const result = onboardingRequestSchema.safeParse(validBody());
    expect(result.success).toBe(true);
  });

  it("accepts a resume-from-draft body without the other fields", () => {
    const result = onboardingRequestSchema.safeParse({
      resumeFromDraft: true,
      acceptedTerms: true,
      invitationCode: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a request missing required fields when not resuming a draft", () => {
    const result = onboardingRequestSchema.safeParse({
      acceptedTerms: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("email");
      expect(paths).toContain("businessName");
      expect(paths).toContain("subdomain");
      expect(paths).toContain("templateId");
      expect(paths).toContain("name");
    }
  });

  it("rejects a non-free templateId with a templateId path issue", () => {
    const result = onboardingRequestSchema.safeParse({
      ...validBody(),
      templateId: COMMERCIAL_TEMPLATE_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "templateId",
        ),
      ).toBe(true);
    }
  });

  it("rejects businessName over 120 characters", () => {
    const result = onboardingRequestSchema.safeParse({
      ...validBody(),
      businessName: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string businessName cleanly (no throw)", () => {
    let result: ReturnType<typeof onboardingRequestSchema.safeParse>;
    expect(() => {
      result = onboardingRequestSchema.safeParse({
        ...validBody(),
        businessName: 123,
      });
    }).not.toThrow();
    expect(result!.success).toBe(false);
  });

  it("rejects a primaryColor CSS-injection attempt", () => {
    const result = onboardingRequestSchema.safeParse({
      ...validBody(),
      primaryColor: "red; background:url(x)",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for invitationCode and aftoken", () => {
    const result = onboardingRequestSchema.safeParse({
      ...validBody(),
      invitationCode: null,
      aftoken: null,
    });
    expect(result.success).toBe(true);
  });

  it("strips unknown keys", () => {
    const result = onboardingRequestSchema.safeParse({
      ...validBody(),
      unexpectedField: "should not survive",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("unexpectedField");
    }
  });

  it("does not reject resumeFromDraft: true even with junk-free extra fields", () => {
    const result = onboardingRequestSchema.safeParse({
      resumeFromDraft: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("onboardingDraftSchema", () => {
  function validDraft() {
    return {
      email: "owner@example.com",
      name: "Jane Owner",
      businessName: "Jane's Shop",
      subdomain: "janes-shop",
      templateId: "modern",
      acceptedTerms: true,
    };
  }

  it("accepts a valid draft", () => {
    expect(onboardingDraftSchema.safeParse(validDraft()).success).toBe(true);
  });

  it("requires acceptedTerms to be the literal true", () => {
    expect(
      onboardingDraftSchema.safeParse({
        ...validDraft(),
        acceptedTerms: false,
      }).success,
    ).toBe(false);
  });

  it("rejects a draft missing acceptedTerms", () => {
    const draft: Record<string, unknown> = validDraft();
    delete draft.acceptedTerms;
    expect(onboardingDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("rejects a non-free templateId", () => {
    expect(
      onboardingDraftSchema.safeParse({
        ...validDraft(),
        templateId: COMMERCIAL_TEMPLATE_ID,
      }).success,
    ).toBe(false);
  });
});
