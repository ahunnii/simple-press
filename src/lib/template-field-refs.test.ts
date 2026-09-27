import { describe, expect, it } from "vitest";

import { keyToPublicUrl } from "~/lib/s3/url";

import {
  collectTemplateFieldRefs,
  emptyRefIds,
  mergeRefIds,
} from "./template-field-refs";

/**
 * Real template + field keys pulled from TEMPLATE_FIELDS (grepped from the
 * `vii` and `bamboo` template field files) so this test exercises the actual
 * registry rather than a synthetic stand-in:
 *
 *   vii.homepage.instagram-gallery        type: "gallery"
 *   vii.homepage.product-rail-collection  type: "collection"
 *   vii.homepage.categories-cards         type: "list" (itemSchema incl. an "image" sub-field)
 *   bamboo.contact.faq                    type: "faq"
 */
const VII = "vii";
const BAMBOO = "bamboo";

const GALLERY_KEY = "vii.homepage.instagram-gallery";
const COLLECTION_KEY = "vii.homepage.product-rail-collection";
const LIST_KEY = "vii.homepage.categories-cards";
const FAQ_KEY = "bamboo.contact.faq";

// Built with the real `keyToPublicUrl` (same convention as
// store-transfer/rewrite.test.ts) so `isStorageUrl` recognizes it.
const STORAGE_URL = keyToPublicUrl("some-biz/photo-aaaa1111.jpg");
const EXTERNAL_URL = "https://cdn.unrelated.example.com/photo.jpg";

describe("collectTemplateFieldRefs", () => {
  it("collects a storage URL from a list-row (image sub-field)", () => {
    const refs = collectTemplateFieldRefs(VII, {
      [LIST_KEY]: [
        { image: STORAGE_URL, title: "Facials", link: "/facials" },
        { image: EXTERNAL_URL, title: "Massage", link: "" },
      ],
    });

    expect(refs[LIST_KEY]?.storageUrls).toEqual([STORAGE_URL]);
    expect(refs[LIST_KEY]?.ids).toEqual(emptyRefIds());
  });

  it("ignores external (non-storage) URLs", () => {
    const refs = collectTemplateFieldRefs(VII, {
      [LIST_KEY]: [{ image: EXTERNAL_URL, title: "x", link: "" }],
    });

    expect(refs[LIST_KEY]).toBeUndefined();
  });

  it("reads a gallery-type field's string value as an id", () => {
    const refs = collectTemplateFieldRefs(VII, {
      [GALLERY_KEY]: "gal_123",
    });

    expect(refs[GALLERY_KEY]?.ids.gallery).toEqual(["gal_123"]);
    expect(refs[GALLERY_KEY]?.storageUrls).toEqual([]);
  });

  it.each(["", "none"])(
    "treats gallery/collection value %j as unset",
    (unset) => {
      const refs = collectTemplateFieldRefs(VII, {
        [GALLERY_KEY]: unset,
        [COLLECTION_KEY]: unset,
      });

      expect(refs[GALLERY_KEY]).toBeUndefined();
      expect(refs[COLLECTION_KEY]).toBeUndefined();
    },
  );

  it("reads a collection-type field's string value as an id", () => {
    const refs = collectTemplateFieldRefs(VII, {
      [COLLECTION_KEY]: "col_456",
    });

    expect(refs[COLLECTION_KEY]?.ids.collection).toEqual(["col_456"]);
  });

  it("parses faq-type field arrays via parseFaqPickerIds", () => {
    const refs = collectTemplateFieldRefs(BAMBOO, {
      [FAQ_KEY]: ["faq_1", "faq_2", "faq_1"],
    });

    expect(refs[FAQ_KEY]?.ids.faq).toEqual(["faq_1", "faq_2"]);
  });

  it("omits keys with no references at all", () => {
    const refs = collectTemplateFieldRefs(VII, {
      "vii.homepage.hero-heading": "Welcome",
      [GALLERY_KEY]: "",
    });

    expect(refs).toEqual({});
  });

  it("collects image/video/gallery/form/quoteCalculator nodes from a TipTap doc", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: STORAGE_URL },
        },
        {
          type: "video",
          attrs: { src: EXTERNAL_URL },
        },
        {
          type: "gallery",
          attrs: { galleryId: "gal_doc_1" },
        },
        {
          type: "form",
          attrs: { formId: "form_doc_1" },
        },
        {
          type: "quoteCalculator",
          attrs: { calculatorId: "qc_doc_1" },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello" }],
        },
      ],
    };

    // Not a real field key — this template's registry doesn't have a
    // richtext key handy, so this exercises the "unknown key → generic deep
    // walk" fallback, which is the same code path a richtext field's stored
    // TipTap doc goes through.
    const refs = collectTemplateFieldRefs(VII, {
      "vii.homepage.some-richtext-field": doc,
    });

    const entry = refs["vii.homepage.some-richtext-field"];
    expect(entry?.storageUrls).toEqual([STORAGE_URL]);
    expect(entry?.ids.gallery).toEqual(["gal_doc_1"]);
    expect(entry?.ids.form).toEqual(["form_doc_1"]);
    expect(entry?.ids.quoteCalculator).toEqual(["qc_doc_1"]);
  });

  it("dedupes storage URLs and ids within a single key", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: STORAGE_URL } },
        { type: "image", attrs: { src: STORAGE_URL } },
        { type: "gallery", attrs: { galleryId: "gal_dup" } },
        { type: "gallery", attrs: { galleryId: "gal_dup" } },
      ],
    };

    const refs = collectTemplateFieldRefs(VII, {
      "vii.homepage.dup-field": doc,
    });

    expect(refs["vii.homepage.dup-field"]?.storageUrls).toEqual([STORAGE_URL]);
    expect(refs["vii.homepage.dup-field"]?.ids.gallery).toEqual(["gal_dup"]);
  });

  it("returns an empty object for an unknown templateId", () => {
    expect(collectTemplateFieldRefs("not-a-real-template", { x: "y" })).toEqual(
      {},
    );
  });
});

describe("mergeRefIds", () => {
  it("unions and dedupes ids across all keys", () => {
    const merged = mergeRefIds({
      a: {
        storageUrls: [],
        ids: { ...emptyRefIds(), gallery: ["g1", "g2"], faq: ["f1"] },
      },
      b: {
        storageUrls: [],
        ids: { ...emptyRefIds(), gallery: ["g2", "g3"], form: ["fm1"] },
      },
    });

    expect(merged.gallery).toEqual(["g1", "g2", "g3"]);
    expect(merged.faq).toEqual(["f1"]);
    expect(merged.form).toEqual(["fm1"]);
    expect(merged.collection).toEqual([]);
    expect(merged.quoteCalculator).toEqual([]);
  });

  it("returns emptyRefIds() shape for no refs", () => {
    expect(mergeRefIds({})).toEqual(emptyRefIds());
  });
});
