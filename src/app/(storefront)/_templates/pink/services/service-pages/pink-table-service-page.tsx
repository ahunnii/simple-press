import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  getRichTextFieldValue,
  isContentEmpty,
  parseFaqPickerIds,
  parseTemplateListRows,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";

import { PinkFactRows } from "../../shared/pink-fact-rows";
import { PinkPhotoHeader } from "../../shared/pink-photo-header";
import { DEFAULT_PINK_TABLE_FACT_ROWS, resolvePinkTableFields } from "./fields";
import { PinkTableBody } from "./pink-table-body";

/** Matches `maxItems` on the `pink-table.faq` picker field. */
const FAQ_MAX_ITEMS = 8;

type PinkTableFaqRow = { question: string; answer: string; _id?: string };

/**
 * The service page's FAQ rows, in priority order:
 *
 *   1. questions picked in the `pink-table.faq` Content → FAQ picker,
 *      resolved against the published FAQ corpus (only fetched when something
 *      is picked, so a service without FAQs costs no query);
 *   2. otherwise, `{question, answer}` rows saved before the field became a
 *      picker (2026-09-26), parsed exactly as before so they keep rendering;
 *   3. otherwise, nothing — the section hides. Unlike the contact-page
 *      pickers there is deliberately no "first N published" fallback here.
 *
 * Picked ids that no longer resolve (unpublished or deleted) hide the
 * section rather than falling through to step 2.
 */
async function resolvePinkTableFaq(raw: unknown): Promise<PinkTableFaqRow[]> {
  const pickedIds = parseFaqPickerIds(raw);
  if (pickedIds) {
    const published = await api.faq.list().catch(() => []);
    return resolveFaqPickerItems(pickedIds, published, FAQ_MAX_ITEMS).map(
      (item) => ({
        question: item.question,
        answer: item.answer,
        _id: item.id,
      }),
    );
  }

  // Legacy rows are objects; a picker value (string ids, possibly all blank)
  // never is, so blank picker slots can't surface as empty accordion rows.
  const legacyRows = Array.isArray(raw)
    ? raw.filter(
        (row): row is Record<string, unknown> =>
          row !== null && typeof row === "object" && !Array.isArray(row),
      )
    : [];
  return parseTemplateListRows(legacyRows).map((row) => ({
    question: typeof row.question === "string" ? row.question : "",
    answer: typeof row.answer === "string" ? row.answer : "",
    _id: row._id,
  }));
}

/**
 * `pink-table` — the PinkArt service detail template (design.md → "Service
 * detail — pink-table"). Not part of the visual editor: fields live on
 * `Service.customFields`, edited at `/admin/services/[id]`, so there are no
 * `sectionGroupAttr`/`fieldAttr`/`isSectionVisible` calls in this file.
 */
export async function PinkTableServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const customFields = service.customFields;
  const raw = customFields as Record<string, unknown> | null | undefined;

  const f = resolvePinkTableFields(customFields, [
    "pink-table.duration-label",
    "pink-table.group-size-label",
    "pink-table.hero-intro",
    "pink-table.body-heading",
    "pink-table.body-paragraph-1",
    "pink-table.body-paragraph-2",
    "pink-table.body-paragraph-3",
    "pink-table.picker-heading",
    "pink-table.picker-intro",
    "pink-table.timeline-heading",
    "pink-table.brings-label",
    "pink-table.provides-label",
    "pink-table.quote-text",
    "pink-table.quote-attribution",
    "pink-table.faq-heading",
    "pink-table.price-eyebrow",
    "pink-table.price-fallback",
    "pink-table.price-qualifier",
    "pink-table.price-cta-label",
    "pink-table.quicklink-1-label",
    "pink-table.quicklink-2-label",
    "pink-table.quicklink-2-href",
    "pink-table.request-heading",
    "pink-table.request-intro",
    "pink-table.request-submit-label",
    "pink-table.request-fallback-label",
  ]);

  // B2.5: the second quick link hides (never swaps destination) when its
  // feature is off — the default `/shop` with products off. A blank saved
  // link still means the field's `/shop` default, as it did before.
  const { isEnabled } = await getBusinessFlags();
  const quicklink2Target =
    (f["pink-table.quicklink-2-href"] ?? "").trim() || "/shop";
  const quicklink2Flag = navHrefOffFlag(quicklink2Target, isEnabled);
  const quicklink2Href =
    quicklink2Flag === null || isEnabled(quicklink2Flag)
      ? quicklink2Target
      : "";

  const richTextRaw = getRichTextFieldValue(
    customFields,
    "pink-table.body-richtext",
  );
  const richText =
    richTextRaw && !isContentEmpty(richTextRaw) ? richTextRaw : null;

  const parsedFactRows = parseTemplateListRows(raw?.["pink-table.fact-rows"]);
  const factRows = (
    parsedFactRows.length > 0 ? parsedFactRows : DEFAULT_PINK_TABLE_FACT_ROWS
  ).map((row) => ({
    label: typeof row.label === "string" ? row.label : "",
    value: typeof row.value === "string" ? row.value : "",
    _id: row._id,
  }));

  const timeline = parseTemplateListRows(raw?.["pink-table.timeline"]).map(
    (row) => ({
      time: typeof row.time === "string" ? row.time : "",
      title: typeof row.title === "string" ? row.title : "",
      body: typeof row.body === "string" ? row.body : "",
      _id: row._id,
    }),
  );

  const brings = parseTemplateListRows(raw?.["pink-table.brings"]).map(
    (row) => ({
      text: typeof row.text === "string" ? row.text : "",
      _id: row._id,
    }),
  );

  const provides = parseTemplateListRows(raw?.["pink-table.provides"]).map(
    (row) => ({
      text: typeof row.text === "string" ? row.text : "",
      _id: row._id,
    }),
  );

  const gallery = parseTemplateListRows(raw?.["pink-table.gallery"]).map(
    (row) => ({
      image: typeof row.image === "string" ? row.image : "",
      alt: typeof row.alt === "string" ? row.alt : "",
      _id: row._id,
    }),
  );

  const faq = await resolvePinkTableFaq(raw?.["pink-table.faq"]);

  return (
    <div className="flex flex-col">
      <PinkPhotoHeader
        imageUrl={service.image ?? ""}
        imageAlt={service.name}
        minHeight="64vh"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.name },
        ]}
        heading={service.name}
        intro={f["pink-table.hero-intro"] ?? ""}
        factRows={
          factRows.length > 0 ? <PinkFactRows rows={factRows} /> : undefined
        }
      />

      <PinkTableBody
        items={items}
        embedsEnabled={embedsEnabled}
        bodyHeading={f["pink-table.body-heading"] ?? ""}
        bodyParagraphs={[
          f["pink-table.body-paragraph-1"] ?? "",
          f["pink-table.body-paragraph-2"] ?? "",
          f["pink-table.body-paragraph-3"] ?? "",
        ]}
        richText={richText}
        pickerHeading={f["pink-table.picker-heading"] ?? ""}
        pickerIntro={f["pink-table.picker-intro"] ?? ""}
        timelineHeading={f["pink-table.timeline-heading"] ?? ""}
        timeline={timeline}
        bringsLabel={f["pink-table.brings-label"] ?? ""}
        brings={brings}
        providesLabel={f["pink-table.provides-label"] ?? ""}
        provides={provides}
        gallery={gallery}
        quoteText={f["pink-table.quote-text"] ?? ""}
        quoteAttribution={f["pink-table.quote-attribution"] ?? ""}
        faqHeading={f["pink-table.faq-heading"] ?? ""}
        faq={faq}
        priceEyebrow={f["pink-table.price-eyebrow"] ?? ""}
        priceFallback={f["pink-table.price-fallback"] ?? ""}
        priceQualifier={f["pink-table.price-qualifier"] ?? ""}
        priceCtaLabel={f["pink-table.price-cta-label"] ?? ""}
        quicklink1Label={f["pink-table.quicklink-1-label"] ?? ""}
        quicklink2Label={f["pink-table.quicklink-2-label"] ?? ""}
        quicklink2Href={quicklink2Href}
        requestHeading={f["pink-table.request-heading"] ?? ""}
        requestIntro={f["pink-table.request-intro"] ?? ""}
        requestSubmitLabel={f["pink-table.request-submit-label"] ?? ""}
        requestFallbackLabel={f["pink-table.request-fallback-label"] ?? ""}
        serviceName={service.name}
      />
    </div>
  );
}
