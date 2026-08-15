import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/env", () => ({
  env: {
    SIMPLEPRESS_HASH_SECRET: "test-hash-secret-for-onboarding-drafts",
  },
}));

const verificationStore = vi.hoisted(() => {
  const rows = new Map<
    string,
    { id: string; identifier: string; value: string; expiresAt: Date }
  >();
  return {
    rows,
    reset() {
      rows.clear();
    },
  };
});

vi.mock("~/server/db", () => ({
  db: {
    verification: {
      findFirst: vi.fn(async ({ where }: { where: { identifier: string } }) => {
        for (const row of verificationStore.rows.values()) {
          if (row.identifier === where.identifier) return row;
        }
        return null;
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { identifier: string; value: string; expiresAt: Date };
        }) => {
          const id = `ver_${verificationStore.rows.size + 1}`;
          const row = { id, ...data };
          verificationStore.rows.set(id, row);
          return row;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { value: string; expiresAt: Date };
        }) => {
          const existing = verificationStore.rows.get(where.id);
          if (!existing) throw new Error("missing");
          const next = { ...existing, ...data };
          verificationStore.rows.set(where.id, next);
          return next;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        verificationStore.rows.delete(where.id);
      }),
    },
  },
}));

describe("onboarding draft", () => {
  beforeEach(() => {
    verificationStore.reset();
    vi.clearAllMocks();
  });

  it("round-trips a signed draft and consumes it once", async () => {
    const {
      saveOnboardingDraft,
      peekOnboardingDraft,
      consumeOnboardingDraft,
    } = await import("./draft");

    const payload = {
      email: "Owner@Example.com",
      name: "Owner",
      businessName: "Acme",
      subdomain: "acme",
      templateId: "modern",
      acceptedTerms: true as const,
    };

    await saveOnboardingDraft(payload);

    const peeked = await peekOnboardingDraft("owner@example.com");
    expect(peeked?.businessName).toBe("Acme");
    expect(peeked?.email).toBe("owner@example.com");

    const consumed = await consumeOnboardingDraft("owner@example.com");
    expect(consumed?.subdomain).toBe("acme");

    expect(await consumeOnboardingDraft("owner@example.com")).toBeNull();
  });

  it("rejects a tampered draft payload", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft({
      email: "a@example.com",
      name: "A",
      businessName: "A",
      subdomain: "a",
      templateId: "modern",
      acceptedTerms: true,
    });

    // Corrupt the stored value in place.
    const row = [...verificationStore.rows.values()][0]!;
    const [body] = row.value.split(".");
    const evilBody = Buffer.from(
      JSON.stringify({
        email: "a@example.com",
        name: "A",
        businessName: "Hacked",
        subdomain: "hacked",
        templateId: "modern",
        acceptedTerms: true,
      }),
      "utf8",
    ).toString("base64url");
    // Keep the old signature so the HMAC check fails.
    row.value = `${evilBody}.${row.value.split(".")[1]}`;
    void body;
    void createHmac;

    expect(await consumeOnboardingDraft("a@example.com")).toBeNull();
  });
});
