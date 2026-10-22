import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTemplateEmailDefaults } from "~/lib/marketing/email-style";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createMembership, createUser } from "../helpers/factories";
import { createMarketingStore } from "../helpers/marketing";

/**
 * Coverage for the email style procedures in
 * `src/server/api/routers/marketing.ts`: `getEmailStyle`, `saveEmailStyle`
 * (including reset) and `previewCampaign` (the admin's live preview).
 */
const reqHost = vi.hoisted(() => ({ value: "mkt-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

async function storeA(opts: { flag?: boolean; address?: boolean } = {}) {
  const store = await createMarketingStore("mkt-a", opts);
  reqHost.value = store.host;
  const caller = createTestCaller({
    userId: store.owner.id,
    email: store.owner.email,
  });
  return { ...store, caller };
}

const BODY = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello there" },
        {
          type: "text",
          text: "Shop now",
          marks: [{ type: "link", attrs: { href: "/shop", variant: "solid" } }],
        },
      ],
    },
  ],
};

describe("marketing router — email style", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns template defaults when nothing is saved", async () => {
    const { caller } = await storeA();
    const result = await caller.marketing.getEmailStyle();
    const defaults = getTemplateEmailDefaults("modern");

    expect(result.saved).toEqual({});
    expect(result.templateId).toBe("modern");
    expect(result.templateName).toBe("Modern");
    expect(result.defaults).toMatchObject({
      accent: defaults.accent,
      pageBackground: defaults.pageBackground,
      font: defaults.font,
      header: "logo-center",
    });
    expect(result.hasLogo).toBe(false);
  });

  it("saves the style as submitted and reads it back", async () => {
    const { business, caller } = await storeA();
    const style = {
      accent: "#B45309",
      pageBackground: "#fff7ed",
      font: "serif" as const,
      header: "logo-left" as const,
      logoSize: "lg" as const,
      showSocial: false,
      footerNote: "Handmade in Detroit.",
    };
    await caller.marketing.saveEmailStyle(style);

    const row = await db.siteContent.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(row.emailStyle).toEqual({ ...style, accent: "#b45309" });
    expect((await caller.marketing.getEmailStyle()).saved).toEqual({
      ...style,
      accent: "#b45309",
    });
  });

  it("rejects an invalid style", async () => {
    const { caller } = await storeA();
    await expect(
      caller.marketing.saveEmailStyle({ accent: "red" }),
    ).rejects.toThrow();
    await expect(
      caller.marketing.saveEmailStyle({ footerNote: "x".repeat(201) }),
    ).rejects.toThrow();
  });

  it("resets to the template defaults by saving null", async () => {
    const { business, caller } = await storeA();
    await caller.marketing.saveEmailStyle({ accent: "#b45309" });
    await caller.marketing.saveEmailStyle(null);

    const row = await db.siteContent.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(row.emailStyle).toBeNull();
    const result = await caller.marketing.getEmailStyle();
    expect(result.saved).toEqual({});
    expect(result.defaults.accent).toBe(
      getTemplateEmailDefaults("modern").accent,
    );
  });

  it("previews with the saved style, an unsaved override, and template defaults", async () => {
    const { caller } = await storeA();
    const defaultAccent = getTemplateEmailDefaults("modern").accent;
    await caller.marketing.saveEmailStyle({ accent: "#b45309" });

    const saved = await caller.marketing.previewCampaign({ bodyJson: BODY });
    expect(saved.html).toContain("#b45309");
    expect(saved.html).toContain("Hello there");

    const override = await caller.marketing.previewCampaign({
      bodyJson: BODY,
      previewText: "Sneak peek",
      styleOverride: { accent: "#0f766e", footerNote: "Unsaved note" },
    });
    expect(override.html).toContain("#0f766e");
    expect(override.html).not.toContain("#b45309");
    expect(override.html).toContain("Unsaved note");
    expect(override.html).toContain("Sneak peek");

    const reset = await caller.marketing.previewCampaign({
      bodyJson: BODY,
      styleOverride: null,
    });
    expect(reset.html).toContain(defaultAccent);
    expect(reset.html).not.toContain("#b45309");

    // Previewing never writes the style.
    expect((await caller.marketing.getEmailStyle()).saved).toEqual({
      accent: "#b45309",
    });
  });

  it("previews without a postal address, and with an empty message", async () => {
    const { caller } = await storeA({ address: false });
    const withBody = await caller.marketing.previewCampaign({ bodyJson: BODY });
    expect(withBody.html).toContain("Hello there");
    expect(withBody.html).not.toContain("1 Main St");
    expect(withBody.html).toContain("#unsubscribe-preview");

    const empty = await caller.marketing.previewCampaign({
      bodyJson: { type: "doc", content: [] },
    });
    expect(empty.html).toContain("#unsubscribe-preview");
    expect(empty.warnings).toEqual([]);
  });

  it("rejects a non-document body", async () => {
    const { caller } = await storeA();
    await expect(
      caller.marketing.previewCampaign({ bodyJson: { type: "paragraph" } }),
    ).rejects.toThrow();
  });

  it("forbids STAFF and gates every procedure on the emailMarketing flag", async () => {
    const { business } = await storeA();
    const staff = await createUser();
    await createMembership(business.id, staff.id, "STAFF");
    const staffCaller = createTestCaller({
      userId: staff.id,
      email: staff.email,
    });
    for (const call of [
      () => staffCaller.marketing.getEmailStyle(),
      () => staffCaller.marketing.saveEmailStyle({ accent: "#b45309" }),
      () => staffCaller.marketing.previewCampaign({ bodyJson: BODY }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }

    await resetDb();
    const { caller } = await storeA({ flag: false });
    for (const call of [
      () => caller.marketing.getEmailStyle(),
      () => caller.marketing.saveEmailStyle(null),
      () => caller.marketing.previewCampaign({ bodyJson: BODY }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
});
