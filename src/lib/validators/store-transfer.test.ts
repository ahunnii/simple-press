/**
 * Back-compat for the store-transfer manifest. Keys added after the format
 * shipped (forms, quoteCalculators, loyaltyProgram, invoiceSettings — plus
 * the older events/videos) must be optional-with-default so a ZIP exported
 * before they existed still parses under the SAME formatVersion.
 */
import { describe, expect, it } from "vitest";

import { STORE_TRANSFER_FORMAT_VERSION } from "~/lib/store-transfer/types";

import { parseManifest } from "./store-transfer";

/** The smallest content block an older (pre-2026-09-25) v2 export carried. */
function minimalContent(): Record<string, unknown> {
  return {
    business: {
      exportId: "biz_src",
      name: "Source Store",
      slug: "source",
      ownerEmail: "owner@source.test",
      templateId: "modern",
      testimonialsAutoApprove: false,
      maintenanceMode: false,
      maintenanceVariant: "simple",
      allowAiCrawlers: true,
      shippingType: "flat",
      offersInStorePickup: false,
      shippingWeightTiers: null,
      businessHours: null,
      salesCountries: ["US"],
      featureFlags: {},
    },
    siteContent: null,
    baseInventoryUnits: [],
    collections: [],
    products: [],
    collectionProducts: [],
    services: [],
    pages: [],
    galleries: [],
    discountCodes: [],
    testimonials: [],
    faqItems: [],
    shippingZones: [],
  };
}

function manifest(content: Record<string, unknown>) {
  return {
    formatVersion: STORE_TRANSFER_FORMAT_VERSION,
    exportedAt: "2026-09-01T00:00:00.000Z",
    source: {
      formatVersion: STORE_TRANSFER_FORMAT_VERSION,
      businessId: "biz_src",
      businessSlug: "source",
      templateId: "modern",
      storageBase: "https://storage.test/bucket/",
    },
    media: [],
    content,
  };
}

describe("parseManifest back-compat", () => {
  it("parses a v2 manifest without any of the 2026-09-25 keys and fills defaults", () => {
    const parsed = parseManifest(manifest(minimalContent()));
    expect(parsed.content.forms).toEqual([]);
    expect(parsed.content.quoteCalculators).toEqual([]);
    expect(parsed.content.loyaltyProgram).toBeNull();
    expect(parsed.content.invoiceSettings).toBeNull();
    // Older back-compat defaults still hold.
    expect(parsed.content.events).toEqual([]);
    expect(parsed.content.videos).toEqual([]);
    // Map pin coordinates — absent from a pre-2026-09-25 manifest.
    expect(parsed.content.business.latitude).toBeUndefined();
    expect(parsed.content.business.longitude).toBeUndefined();
  });

  it("parses a manifest carrying map pin coordinates", () => {
    const base = minimalContent();
    const parsed = parseManifest(
      manifest({
        ...base,
        business: {
          ...(base.business as Record<string, unknown>),
          latitude: 42.3314,
          longitude: -83.0458,
        },
      }),
    );
    expect(parsed.content.business.latitude).toBe(42.3314);
    expect(parsed.content.business.longitude).toBe(-83.0458);
  });

  it("parses a manifest with explicit null map pin coordinates", () => {
    const base = minimalContent();
    const parsed = parseManifest(
      manifest({
        ...base,
        business: {
          ...(base.business as Record<string, unknown>),
          latitude: null,
          longitude: null,
        },
      }),
    );
    expect(parsed.content.business.latitude).toBeNull();
    expect(parsed.content.business.longitude).toBeNull();
  });

  it("parses a manifest carrying forms, quote calculators, loyalty and invoice settings", () => {
    const parsed = parseManifest(
      manifest({
        ...minimalContent(),
        forms: [
          {
            exportId: "form_1",
            name: "Contact",
            definition: { version: 1, fields: [] },
            published: true,
          },
        ],
        quoteCalculators: [
          {
            exportId: "calc_1",
            name: "Moving quote",
            definition: { version: 2, screens: [] },
            published: false,
          },
        ],
        loyaltyProgram: {
          earnOnOrders: true,
          pointsPerDollar: 2,
          signupEnabled: true,
          signupBonus: 100,
          firstOrderEnabled: false,
          firstOrderBonus: 0,
          birthdayEnabled: false,
          birthdayBonus: 0,
          socialEnabled: false,
          socialFollowBonus: 0,
          rewardCodeExpiryDays: 60,
          tiers: [
            {
              exportId: "tier_1",
              label: "$5 off",
              pointsCost: 500,
              type: "fixed",
              value: 500,
              minPurchase: null,
              sortOrder: 0,
              active: true,
            },
          ],
        },
        invoiceSettings: {
          numberPrefix: "Q-",
          numberPadding: 5,
          startingNumber: 100,
          defaultDueTerms: "net_15",
          defaultTaxRateBps: 625,
          defaultNotes: "Thanks!",
          defaultTerms: null,
          overdueAlertsEnabled: true,
          weeklyDigestEnabled: false,
          // A hand-edited manifest smuggling this in gets it stripped.
          paymentMethods: '[{"account":"123"}]',
        },
      }),
    );

    expect(parsed.content.forms).toHaveLength(1);
    expect(parsed.content.forms[0]?.name).toBe("Contact");
    expect(parsed.content.quoteCalculators[0]?.exportId).toBe("calc_1");
    expect(parsed.content.loyaltyProgram?.tiers).toHaveLength(1);
    expect(parsed.content.loyaltyProgram?.pointsPerDollar).toBe(2);
    expect(parsed.content.invoiceSettings?.numberPrefix).toBe("Q-");
    expect(parsed.content.invoiceSettings).not.toHaveProperty("paymentMethods");
  });

  it("accepts explicit null 1:1 blocks", () => {
    const parsed = parseManifest(
      manifest({
        ...minimalContent(),
        loyaltyProgram: null,
        invoiceSettings: null,
      }),
    );
    expect(parsed.content.loyaltyProgram).toBeNull();
    expect(parsed.content.invoiceSettings).toBeNull();
  });

  it("accepts maintenanceMessage as a TipTap doc (current) or a string (legacy)", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
    };
    for (const maintenanceMessage of [doc, "Back soon", null]) {
      const base = minimalContent();
      const parsed = parseManifest(
        manifest({
          ...base,
          business: {
            ...(base.business as Record<string, unknown>),
            maintenanceMessage,
          },
        }),
      );
      expect(parsed.content.business.maintenanceMessage).toEqual(
        maintenanceMessage,
      );
    }
  });
});
