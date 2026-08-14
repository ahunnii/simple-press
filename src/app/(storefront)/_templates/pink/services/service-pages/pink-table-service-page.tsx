import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { TemplateListRow } from "~/lib/template-fields";
import {
  getRichTextFieldValue,
  isContentEmpty,
  parseTemplateListRows,
} from "~/lib/template-fields";

import { PinkFactRows } from "../../shared/pink-fact-rows";
import { PinkPhotoHeader } from "../../shared/pink-photo-header";
import { resolvePinkTableFields } from "./fields";
import { PinkTableBody } from "./pink-table-body";

// `parseTemplateListRows` reads `customFields` directly and ignores a list
// field's `defaultValue` (list fields bypass `resolveFields` entirely — see
// field-conventions.md), so the hero fact rows — not hideable — need a real
// hardcoded fallback or a fresh Service renders an empty panel.
const DEFAULT_FACT_ROWS: TemplateListRow[] = [
  {
    label: "Where",
    value: "Your space — school, church, library or workplace",
  },
  { label: "Group size", value: "10 to 12 at a table" },
  { label: "Materials", value: "Everything included" },
  { label: "Notice", value: "Book at least 2 weeks out" },
];

/**
 * `pink-table` — the PinkArt service detail template (design.md → "Service
 * detail — pink-table"). Not part of the visual editor: fields live on
 * `Service.customFields`, edited at `/admin/services/[id]`, so there are no
 * `sectionGroupAttr`/`fieldAttr`/`isSectionVisible` calls in this file.
 */
export function PinkTableServicePage({
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

  const richTextRaw = getRichTextFieldValue(
    customFields,
    "pink-table.body-richtext",
  );
  const richText =
    richTextRaw && !isContentEmpty(richTextRaw) ? richTextRaw : null;

  const parsedFactRows = parseTemplateListRows(raw?.["pink-table.fact-rows"]);
  const factRows = (
    parsedFactRows.length > 0 ? parsedFactRows : DEFAULT_FACT_ROWS
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

  const faq = parseTemplateListRows(raw?.["pink-table.faq"]).map((row) => ({
    question: typeof row.question === "string" ? row.question : "",
    answer: typeof row.answer === "string" ? row.answer : "",
    _id: row._id,
  }));

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
        quicklink2Href={f["pink-table.quicklink-2-href"] ?? ""}
        requestHeading={f["pink-table.request-heading"] ?? ""}
        requestIntro={f["pink-table.request-intro"] ?? ""}
        requestSubmitLabel={f["pink-table.request-submit-label"] ?? ""}
        requestFallbackLabel={f["pink-table.request-fallback-label"] ?? ""}
        serviceName={service.name}
      />
    </div>
  );
}
