import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  StoreTransferManifest,
  StoreTransferMediaEntry,
} from "~/lib/store-transfer/types";
import { contentAddressedKey, putStoredObject } from "~/lib/s3/put";
import { keyToPublicUrl } from "~/lib/s3/url";
import { collectStoreContent } from "~/lib/store-transfer/export";
import { importStoreBundle } from "~/lib/store-transfer/import";
import { STORE_TRANSFER_FORMAT_VERSION } from "~/lib/store-transfer/types";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createDiscount,
  createLoyaltyProgram,
  createLoyaltyTier,
  createPage,
} from "../helpers/factories";

/**
 * End-to-end store transfer: export business A with `collectStoreContent`,
 * zip the manifest exactly as the export route does (manifest.json, no media),
 * and import into business B with `importStoreBundle`.
 *
 * Focus is on the 2026-09-25 additions — forms / quote calculators (and the
 * page embeds that reference them), loyalty program config, invoice settings
 * (minus paymentMethods), service-item price tiers/add-ons and product
 * subscription fields — plus idempotency of a second import.
 *
 * Most cases pass `media: []`, so the S3 helpers in import.ts are never
 * called. The media case does carry files; the two network-bound helpers
 * (`objectExists` / `putStoredObject`) are stubbed below, while the real
 * `contentAddressedKey` still derives the target keys.
 */

vi.mock("~/lib/s3/put", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/s3/put")>()),
  objectExists: vi.fn(async () => false),
  putStoredObject: vi.fn(async () => undefined),
}));

/** Valid for BOTH formDefinitionSchema and storedFormDefinitionSchema. */
const FORM_DEFINITION = {
  version: 1,
  fields: [
    { id: "f_name", type: "text", label: "Name", required: true },
    { id: "f_email", type: "email", label: "Email", required: true },
  ],
  settings: {},
};

/** Minimal v2 calculator: one number question feeding the formula. */
const CALCULATOR_DEFINITION = {
  version: 2,
  screens: [
    {
      id: "s_rooms",
      questions: [
        {
          id: "q_rooms",
          type: "number",
          title: "Rooms",
          variableName: "rooms",
          min: 0,
          max: 10,
        },
      ],
    },
  ],
  distances: [],
  formula: "100 + rooms * 50",
};

const SOURCE_PAYMENT_METHODS = JSON.stringify([
  { type: "bank", label: "Source bank", details: "ACCT 111-SOURCE" },
]);
const TARGET_PAYMENT_METHODS = JSON.stringify([
  { type: "bank", label: "Target bank", details: "ACCT 999-TARGET" },
]);

async function seedSource() {
  const a = await createBusiness({ name: "Source A" });
  await db.business.update({
    where: { id: a.id },
    data: { latitude: 42.3314, longitude: -83.0458 },
  });

  const form = await db.form.create({
    data: {
      businessId: a.id,
      name: "Contact us",
      definition: FORM_DEFINITION,
      published: true,
    },
  });
  const calculator = await db.quoteCalculator.create({
    data: {
      businessId: a.id,
      name: "Room estimate",
      definition: CALCULATOR_DEFINITION,
      published: true,
    },
  });

  await createPage(a.id, {
    slug: "get-a-quote",
    title: "Get a quote",
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        { type: "form", attrs: { formId: form.id } },
        { type: "quoteCalculator", attrs: { calculatorId: calculator.id } },
      ],
    },
    previewDraft: {
      title: "Get a quote (draft)",
      excerpt: null,
      content: {
        type: "doc",
        content: [{ type: "form", attrs: { formId: form.id } }],
      },
    },
  });

  const program = await createLoyaltyProgram(a.id, {
    pointsPerDollar: 3,
    signupBonus: 250,
    rewardCodeExpiryDays: 45,
  });
  await createLoyaltyTier(program.id, a.id, {
    label: "$5 off",
    pointsCost: 500,
    type: "fixed",
    value: 500,
    sortOrder: 0,
  });
  await createLoyaltyTier(program.id, a.id, {
    label: "10% off",
    pointsCost: 900,
    type: "percentage",
    value: 10,
    minPurchase: 2000,
    sortOrder: 1,
  });

  await db.invoiceSettings.create({
    data: {
      businessId: a.id,
      numberPrefix: "SRC-",
      numberPadding: 6,
      startingNumber: 500,
      defaultDueTerms: "net_15",
      defaultTaxRateBps: 625,
      defaultNotes: "Thanks for your business",
      defaultTerms: "Payment due on receipt",
      paymentMethods: SOURCE_PAYMENT_METHODS,
      overdueAlertsEnabled: false,
      weeklyDigestEnabled: false,
    },
  });

  await db.service.create({
    data: {
      businessId: a.id,
      name: "Cleaning",
      slug: "cleaning",
      serviceTemplateId: "default",
      items: {
        create: {
          businessId: a.id,
          name: "Deep clean",
          priceLabel: "$200",
          priceTiers: [
            { label: "Studio", priceLabel: "$150" },
            { label: "House", priceLabel: "$300", compareAtPriceLabel: "$350" },
          ],
          addOns: [{ name: "Fridge", priceLabel: "$25" }],
        },
      },
    },
  });

  await db.product.create({
    data: {
      businessId: a.id,
      name: "Coffee beans",
      slug: "coffee-beans",
      price: 1800,
      subscriptionEnabled: true,
      subscriptionIntervals: ["week", "month"],
      subscriptionDiscountPercent: 15,
    },
  });

  await createDiscount(a.id, { code: "MANUAL10" });
  await db.discountCode.create({
    data: {
      businessId: a.id,
      code: "LOYAL-XYZ",
      type: "fixed",
      value: 500,
      source: "loyalty",
    },
  });

  return { a, form, calculator };
}

/** A media file to ship in the bundle, keyed under the source business. */
type BundleMedia = { key: string; bytes: Buffer; kind: "image" | "video" };

async function buildZip(
  businessId: string,
  mediaFiles: BundleMedia[] = [],
): Promise<Buffer> {
  const { manifestContent, templateId, businessSlug } =
    await collectStoreContent(businessId);
  const manifest: StoreTransferManifest = {
    formatVersion: STORE_TRANSFER_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      formatVersion: STORE_TRANSFER_FORMAT_VERSION,
      businessId,
      businessSlug,
      templateId,
      storageBase: "https://storage.test/bucket/",
    },
    media: mediaFiles.map(
      (m, i): StoreTransferMediaEntry => ({
        originalUrl: keyToPublicUrl(m.key),
        originalKey: m.key,
        zipPath: `media/${String(i + 1).padStart(4, "0")}-${m.key.split("/").pop()}`,
        kind: m.kind,
        bytes: m.bytes.byteLength,
      }),
    ),
    content: manifestContent,
  };
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest));
  manifest.media.forEach((entry, i) => {
    zip.file(entry.zipPath, mediaFiles[i]!.bytes);
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("store transfer round-trip", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(putStoredObject).mockClear();
  });

  it("exports never carry paymentMethods or loyalty-sourced codes", async () => {
    const { a } = await seedSource();
    const { manifestContent } = await collectStoreContent(a.id);

    expect(manifestContent.invoiceSettings).not.toBeNull();
    expect(manifestContent.invoiceSettings).not.toHaveProperty(
      "paymentMethods",
    );
    expect(JSON.stringify(manifestContent)).not.toContain("ACCT 111-SOURCE");
    expect(manifestContent.discountCodes.map((d) => d.code)).toEqual([
      "MANUAL10",
    ]);
    expect(manifestContent.forms).toHaveLength(1);
    expect(manifestContent.quoteCalculators).toHaveLength(1);
    expect(manifestContent.loyaltyProgram?.tiers).toHaveLength(2);
  });

  it("imports forms/calculators/loyalty/invoice config and remaps page embeds", async () => {
    const { form: srcForm, calculator: srcCalc, a } = await seedSource();
    const b = await createBusiness({ name: "Target B" });
    await db.invoiceSettings.create({
      data: {
        businessId: b.id,
        paymentMethods: TARGET_PAYMENT_METHODS,
      },
    });

    const zipBuffer = await buildZip(a.id);
    const result = await importStoreBundle({
      targetBusinessId: b.id,
      zipBuffer,
    });

    // No row-level failures (the template-change notice is informational).
    expect(
      result.warnings.filter((w) => !w.startsWith("Template changed")),
    ).toEqual([]);

    // ── Forms / calculators: new rows in B, embeds point at them ──
    const bForms = await db.form.findMany({ where: { businessId: b.id } });
    const bCalcs = await db.quoteCalculator.findMany({
      where: { businessId: b.id },
    });
    expect(bForms).toHaveLength(1);
    expect(bCalcs).toHaveLength(1);
    const bForm = bForms[0]!;
    const bCalc = bCalcs[0]!;
    expect(bForm.id).not.toBe(srcForm.id);
    expect(bCalc.id).not.toBe(srcCalc.id);
    expect(bForm.name).toBe("Contact us");
    expect(bForm.published).toBe(true);
    expect(bCalc.name).toBe("Room estimate");

    const page = await db.page.findUniqueOrThrow({
      where: { businessId_slug: { businessId: b.id, slug: "get-a-quote" } },
    });
    const nodes = (
      page.content as {
        content: { type: string; attrs?: Record<string, unknown> }[];
      }
    ).content;
    expect(nodes.find((n) => n.type === "form")?.attrs?.formId).toBe(bForm.id);
    expect(
      nodes.find((n) => n.type === "quoteCalculator")?.attrs?.calculatorId,
    ).toBe(bCalc.id);
    const draft = page.previewDraft as {
      content: { content: { type: string; attrs?: Record<string, unknown> }[] };
    };
    expect(draft.content.content[0]?.attrs?.formId).toBe(bForm.id);

    // ── Discount codes: manual transferred, loyalty not ──
    const bCodes = await db.discountCode.findMany({
      where: { businessId: b.id },
      select: { code: true, source: true },
    });
    expect(bCodes).toEqual([{ code: "MANUAL10", source: "manual" }]);

    // ── Loyalty program + tiers ──
    const bProgram = await db.loyaltyProgram.findUniqueOrThrow({
      where: { businessId: b.id },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });
    expect(bProgram.pointsPerDollar).toBe(3);
    expect(bProgram.signupBonus).toBe(250);
    expect(bProgram.rewardCodeExpiryDays).toBe(45);
    expect(
      bProgram.tiers.map((t) => ({
        label: t.label,
        pointsCost: t.pointsCost,
        type: t.type,
        value: t.value,
        minPurchase: t.minPurchase,
        businessId: t.businessId,
      })),
    ).toEqual([
      {
        label: "$5 off",
        pointsCost: 500,
        type: "fixed",
        value: 500,
        minPurchase: null,
        businessId: b.id,
      },
      {
        label: "10% off",
        pointsCost: 900,
        type: "percentage",
        value: 10,
        minPurchase: 2000,
        businessId: b.id,
      },
    ]);

    // ── Map pin coordinates carried through ──
    const bBizCoords = await db.business.findUniqueOrThrow({
      where: { id: b.id },
      select: { latitude: true, longitude: true },
    });
    expect(bBizCoords.latitude).toBe(42.3314);
    expect(bBizCoords.longitude).toBe(-83.0458);

    // ── Invoice settings: config copied, B's paymentMethods untouched ──
    const bInvoice = await db.invoiceSettings.findUniqueOrThrow({
      where: { businessId: b.id },
    });
    expect(bInvoice.numberPrefix).toBe("SRC-");
    expect(bInvoice.numberPadding).toBe(6);
    expect(bInvoice.startingNumber).toBe(500);
    expect(bInvoice.defaultDueTerms).toBe("net_15");
    expect(bInvoice.defaultTaxRateBps).toBe(625);
    expect(bInvoice.defaultNotes).toBe("Thanks for your business");
    expect(bInvoice.defaultTerms).toBe("Payment due on receipt");
    expect(bInvoice.overdueAlertsEnabled).toBe(false);
    expect(bInvoice.weeklyDigestEnabled).toBe(false);
    expect(bInvoice.paymentMethods).toBe(TARGET_PAYMENT_METHODS);

    // ── Service item tiers / add-ons ──
    const bItem = await db.serviceItem.findFirstOrThrow({
      where: { businessId: b.id, name: "Deep clean" },
    });
    expect(bItem.priceTiers).toEqual([
      { label: "Studio", priceLabel: "$150" },
      { label: "House", priceLabel: "$300", compareAtPriceLabel: "$350" },
    ]);
    expect(bItem.addOns).toEqual([{ name: "Fridge", priceLabel: "$25" }]);

    // ── Product subscription fields ──
    const bProduct = await db.product.findUniqueOrThrow({
      where: { businessId_slug: { businessId: b.id, slug: "coffee-beans" } },
    });
    expect(bProduct.subscriptionEnabled).toBe(true);
    expect(bProduct.subscriptionIntervals).toEqual(["week", "month"]);
    expect(bProduct.subscriptionDiscountPercent).toBe(15);

    // ── Second import is idempotent for forms / calculators / tiers ──
    const second = await importStoreBundle({
      targetBusinessId: b.id,
      zipBuffer,
    });
    expect(second.perModel.Form).toEqual({ created: 0, updated: 1 });
    expect(second.perModel.QuoteCalculator).toEqual({ created: 0, updated: 1 });
    expect(second.perModel.LoyaltyRewardTier).toEqual({
      created: 0,
      updated: 2,
    });
    expect(await db.form.count({ where: { businessId: b.id } })).toBe(1);
    expect(
      await db.quoteCalculator.count({ where: { businessId: b.id } }),
    ).toBe(1);
    expect(
      await db.loyaltyRewardTier.count({ where: { businessId: b.id } }),
    ).toBe(2);

    // Embeds still point at the (same) target rows after the re-import.
    const pageAgain = await db.page.findUniqueOrThrow({
      where: { businessId_slug: { businessId: b.id, slug: "get-a-quote" } },
    });
    const nodesAgain = (
      pageAgain.content as {
        content: { type: string; attrs?: Record<string, unknown> }[];
      }
    ).content;
    expect(nodesAgain.find((n) => n.type === "form")?.attrs?.formId).toBe(
      bForm.id,
    );
  });

  it("skips a form with an invalid definition and leaves its embed id as-is", async () => {
    const a = await createBusiness({ name: "Source A" });
    const bad = await db.form.create({
      data: {
        businessId: a.id,
        name: "Broken",
        definition: { version: 99, nonsense: true },
      },
    });
    await createPage(a.id, {
      slug: "broken",
      content: {
        type: "doc",
        content: [{ type: "form", attrs: { formId: bad.id } }],
      },
    });
    const b = await createBusiness({ name: "Target B" });

    const result = await importStoreBundle({
      targetBusinessId: b.id,
      zipBuffer: await buildZip(a.id),
    });

    expect(
      result.warnings.some((w) => w.startsWith('Form "Broken" skipped')),
    ).toBe(true);
    expect(await db.form.count({ where: { businessId: b.id } })).toBe(0);
    const page = await db.page.findUniqueOrThrow({
      where: { businessId_slug: { businessId: b.id, slug: "broken" } },
    });
    expect(
      (page.content as { content: { attrs: { formId: string } }[] }).content[0]
        ?.attrs.formId,
    ).toBe(bad.id);
    // No loyalty/invoice block in the source → target untouched.
    expect(
      await db.loyaltyProgram.findUnique({ where: { businessId: b.id } }),
    ).toBeNull();
    expect(
      await db.invoiceSettings.findUnique({ where: { businessId: b.id } }),
    ).toBeNull();
  });

  it("rewrites maintenance flyer/message and rich-text video URLs to the target bucket", async () => {
    const a = await createBusiness({ name: "Source A" });
    const flyer: BundleMedia = {
      key: `${a.id}/image-flyer.jpg`,
      bytes: Buffer.from("flyer-bytes"),
      kind: "image",
    };
    const inline: BundleMedia = {
      key: `${a.id}/image-inline.png`,
      bytes: Buffer.from("inline-bytes"),
      kind: "image",
    };
    const clip: BundleMedia = {
      key: `${a.id}/video-clip.mp4`,
      bytes: Buffer.from("clip-bytes"),
      kind: "video",
    };

    await db.business.update({
      where: { id: a.id },
      data: {
        maintenanceImage: keyToPublicUrl(flyer.key),
        maintenanceMessage: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Soon!" }] },
            { type: "image", attrs: { src: keyToPublicUrl(inline.key) } },
          ],
        },
      },
    });
    await createPage(a.id, {
      slug: "tour",
      content: {
        type: "doc",
        content: [{ type: "video", attrs: { src: keyToPublicUrl(clip.key) } }],
      },
    });
    const b = await createBusiness({ name: "Target B" });

    const result = await importStoreBundle({
      targetBusinessId: b.id,
      zipBuffer: await buildZip(a.id, [flyer, inline, clip]),
    });

    // Includes the post-import check, which reports any usage-index URL still
    // pointing at a re-hosted source object.
    expect(
      result.warnings.filter((w) => !w.startsWith("Template changed")),
    ).toEqual([]);
    expect(vi.mocked(putStoredObject)).toHaveBeenCalledTimes(3);

    const targetUrl = (m: BundleMedia, ext: string) =>
      keyToPublicUrl(contentAddressedKey(b.id, m.kind, m.bytes, ext));

    const bBiz = await db.business.findUniqueOrThrow({
      where: { id: b.id },
      select: { maintenanceImage: true, maintenanceMessage: true },
    });
    expect(bBiz.maintenanceImage).toBe(targetUrl(flyer, ".jpg"));
    const messageNodes = (
      bBiz.maintenanceMessage as {
        content: { type: string; attrs?: Record<string, unknown> }[];
      }
    ).content;
    expect(messageNodes.find((n) => n.type === "image")?.attrs?.src).toBe(
      targetUrl(inline, ".png"),
    );

    const page = await db.page.findUniqueOrThrow({
      where: { businessId_slug: { businessId: b.id, slug: "tour" } },
    });
    expect(
      (page.content as { content: { attrs: { src: string } }[] }).content[0]
        ?.attrs.src,
    ).toBe(targetUrl(clip, ".mp4"));
  });
});
