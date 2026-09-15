import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const HASH_SECRET = "test-hash-secret-for-onboarding-drafts";

vi.mock("~/env", () => ({
  env: {
    SIMPLEPRESS_HASH_SECRET: HASH_SECRET,
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

const basePayload = {
  email: "owner@example.com",
  name: "Owner",
  businessName: "Acme",
  subdomain: "acme",
  templateId: "modern",
  acceptedTerms: true as const,
};

function onlyRow() {
  const row = [...verificationStore.rows.values()][0];
  expect(row).toBeDefined();
  return row!;
}

/** Re-implements the module's own packing so tests can forge stored rows. */
function packForTest(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", HASH_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

describe("onboarding draft", () => {
  beforeEach(() => {
    verificationStore.reset();
    vi.clearAllMocks();
  });

  it("round-trips a signed draft and consumes it once", async () => {
    const { saveOnboardingDraft, peekOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    const saved = await saveOnboardingDraft(
      { ...basePayload, email: "Owner@Example.com" },
      { draftSecret: "secret-a" },
    );
    expect(saved).toEqual({ status: "saved", draftSecret: "secret-a" });

    const peeked = await peekOnboardingDraft("owner@example.com");
    expect(peeked?.businessName).toBe("Acme");
    expect(peeked?.email).toBe("owner@example.com");

    const consumed = await consumeOnboardingDraft(
      "owner@example.com",
      "secret-a",
    );
    expect(consumed?.subdomain).toBe("acme");

    expect(
      await consumeOnboardingDraft("owner@example.com", "secret-a"),
    ).toBeNull();
  });

  it("never exposes the draft secret hash to callers", async () => {
    const { saveOnboardingDraft, peekOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(basePayload, { draftSecret: "secret-a" });

    const peeked = await peekOnboardingDraft("owner@example.com");
    expect(peeked).not.toHaveProperty("draftSecretHash");

    const consumed = await consumeOnboardingDraft(
      "owner@example.com",
      "secret-a",
    );
    expect(consumed).not.toHaveProperty("draftSecretHash");
  });

  it("refuses to consume without the browser secret, and keeps the draft", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(basePayload, { draftSecret: "secret-a" });

    expect(await consumeOnboardingDraft("owner@example.com", null)).toBeNull();
    expect(
      await consumeOnboardingDraft("owner@example.com", "wrong-secret"),
    ).toBeNull();
    // Not deleted — the rightful owner may just be in another browser.
    expect(verificationStore.rows.size).toBe(1);

    const consumed = await consumeOnboardingDraft(
      "owner@example.com",
      "secret-a",
    );
    expect(consumed?.businessName).toBe("Acme");
  });

  it("refuses to overwrite a live draft without its secret", async () => {
    const { saveOnboardingDraft, peekOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(basePayload, { draftSecret: "victim-secret" });

    const attack = await saveOnboardingDraft(
      { ...basePayload, businessName: "Evil Co", subdomain: "evil" },
      { draftSecret: "attacker-secret", presentedSecret: null },
    );
    expect(attack).toEqual({ status: "conflict" });

    const peeked = await peekOnboardingDraft("owner@example.com");
    expect(peeked?.businessName).toBe("Acme");
    expect(peeked?.subdomain).toBe("acme");
  });

  it("allows the same browser to overwrite and keeps the original secret", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(basePayload, { draftSecret: "secret-a" });

    const again = await saveOnboardingDraft(
      { ...basePayload, businessName: "Acme Two", subdomain: "acme-two" },
      { draftSecret: "secret-b", presentedSecret: "secret-a" },
    );
    // Same secret back, so the cookie the browser already holds stays valid.
    expect(again).toEqual({ status: "saved", draftSecret: "secret-a" });
    expect(verificationStore.rows.size).toBe(1);

    const consumed = await consumeOnboardingDraft(
      "owner@example.com",
      "secret-a",
    );
    expect(consumed?.subdomain).toBe("acme-two");
  });

  it("overwrites an expired draft freely", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(basePayload, { draftSecret: "old-secret" });
    onlyRow().expiresAt = new Date(Date.now() - 1000);

    const result = await saveOnboardingDraft(
      { ...basePayload, subdomain: "acme-new" },
      { draftSecret: "new-secret", presentedSecret: null },
    );
    expect(result).toEqual({ status: "saved", draftSecret: "new-secret" });

    const consumed = await consumeOnboardingDraft(
      "owner@example.com",
      "new-secret",
    );
    expect(consumed?.subdomain).toBe("acme-new");
  });

  it("drops an expired draft on consume", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(basePayload, { draftSecret: "secret-a" });
    onlyRow().expiresAt = new Date(Date.now() - 1000);

    expect(
      await consumeOnboardingDraft("owner@example.com", "secret-a"),
    ).toBeNull();
    expect(verificationStore.rows.size).toBe(0);
  });

  it("rejects a tampered draft payload", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    await saveOnboardingDraft(
      { ...basePayload, email: "a@example.com", name: "A", businessName: "A" },
      { draftSecret: "secret-a" },
    );

    // Corrupt the stored value in place, keeping the old signature.
    const row = onlyRow();
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
    row.value = `${evilBody}.${row.value.split(".")[1]}`;

    expect(
      await consumeOnboardingDraft("a@example.com", "secret-a"),
    ).toBeNull();
  });

  it("cannot consume a pre-binding draft, but such a draft may be replaced", async () => {
    const { saveOnboardingDraft, consumeOnboardingDraft } =
      await import("./draft");

    // A legitimately-signed row written before browser binding existed.
    verificationStore.rows.set("legacy", {
      id: "legacy",
      identifier: "onboarding-draft:owner@example.com",
      value: packForTest(basePayload),
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(
      await consumeOnboardingDraft("owner@example.com", "anything"),
    ).toBeNull();
    // Left in place; it simply expires.
    expect(verificationStore.rows.size).toBe(1);

    const result = await saveOnboardingDraft(basePayload, {
      draftSecret: "fresh-secret",
      presentedSecret: null,
    });
    expect(result).toEqual({ status: "saved", draftSecret: "fresh-secret" });
    expect(
      (await consumeOnboardingDraft("owner@example.com", "fresh-secret"))
        ?.businessName,
    ).toBe("Acme");
  });
});
