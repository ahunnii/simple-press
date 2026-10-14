/** Readable documents for services (with their priced items). */
import { esc, fieldTable } from "../html";
import { SITE_EXPORT_DIRS } from "../types";
import { renderFieldList } from "./fields";
import {
  docLink,
  indexDoc,
  inlineText,
  linkHtml,
  imgHtml,
  photosGridHtml,
  plainTextHtml,
  seoRows,
  shell,
  tableHtml,
  yesNo,
} from "./shared";
import type {
  FieldDef,
  RenderCtx,
  ServiceInput,
  ServiceItemInput,
} from "./types";

export const SERVICES_INDEX_PATH = `${SITE_EXPORT_DIRS.services}/index.html`;
const SERVICES_CRUMB = { label: "Services", zipPath: SERVICES_INDEX_PATH };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function tiersHtml(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  const rows = raw
    .filter(isRecord)
    .map((t) => [esc(str(t.label)), esc(str(t.priceLabel)), esc(str(t.compareAtPriceLabel))])
    .filter((r) => r.some((c) => c));
  return tableHtml(["Option", "Price", "Was"], rows);
}

function addOnsHtml(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  const rows = raw
    .filter(isRecord)
    .map((a) => [esc(str(a.name)), esc(str(a.priceLabel)), inlineText(str(a.description))])
    .filter((r) => r.some((c) => c));
  return tableHtml(["Add-on", "Price", "Details"], rows);
}

function itemHtml(item: ServiceItemInput, ctx: RenderCtx, docPath: string): string {
  const tiers = tiersHtml(item.priceTiers);
  const addOns = addOnsHtml(item.addOns);
  return [
    `<h3>${esc(item.name)}</h3>`,
    fieldTable([
      ["Price", esc(item.priceLabel ?? "")],
      ["Was price", esc(item.compareAtPriceLabel ?? "")],
      ["Duration", esc(item.durationLabel ?? "")],
      ["Section", esc(item.category ?? "")],
      ["Signature item", item.isSignature ? yesNo(true) : ""],
      ["Status", item.published ? "" : "Draft (not visible on your site)"],
      ["Online booking widget", item.bookingEmbedSrc ? linkHtml(item.bookingEmbedSrc) : ""],
    ]),
    item.image ? photosGridHtml(ctx, docPath, [{ url: item.image, alt: item.name }]) : "",
    plainTextHtml(item.description),
    tiers ? `<h4>Price options</h4>${tiers}` : "",
    addOns ? `<h4>Add-ons</h4>${addOns}` : "",
  ].join("");
}

export function renderServiceDoc(
  s: ServiceInput,
  ctx: RenderCtx,
  docPath: string,
  fieldInfo: { fields: FieldDef[]; groupTitles: Record<string, string> } = {
    fields: [],
    groupTitles: {},
  },
): string {
  const details = fieldTable([
    ["Name", esc(s.name)],
    ["Status", s.published ? "Published" : "Draft (not visible on your site)"],
    ["Address on your site", linkHtml(`${ctx.business.siteUrl}/services/${s.slug}`)],
    ...seoRows(s),
    ["Social share image", s.ogImage ? imgHtml(ctx, docPath, s.ogImage, "") : ""],
  ]);
  const pageFields = renderFieldList(
    fieldInfo.fields,
    s.customFields,
    ctx,
    docPath,
    fieldInfo.groupTitles,
  );
  const body = [
    details,
    s.image ? `<h2>Main image</h2>${photosGridHtml(ctx, docPath, [{ url: s.image, alt: s.name }])}` : "",
    s.description ? `<h2>Description</h2>${plainTextHtml(s.description)}` : "",
    pageFields,
    s.items.length > 0
      ? `<h2>Services offered</h2>${s.items.map((i) => itemHtml(i, ctx, docPath)).join("")}`
      : "",
  ].join("");
  return shell(ctx, {
    docPath,
    title: s.name,
    breadcrumbs: [SERVICES_CRUMB, { label: s.name }],
    bodyHtml: body,
  });
}

export function renderServicesIndex(
  entries: Array<{ service: ServiceInput; path: string }>,
  ctx: RenderCtx,
): string {
  return indexDoc(ctx, {
    docPath: SERVICES_INDEX_PATH,
    title: "Services",
    intro: `${entries.length} service${entries.length === 1 ? "" : "s"}.`,
    headers: ["Service", "Offerings", "Status"],
    rows: entries.map(({ service: s, path }) => [
      docLink(SERVICES_INDEX_PATH, path, s.name),
      esc(s.items.length),
      s.published ? "Published" : "Draft",
    ]),
    breadcrumbs: [{ label: "Services" }],
  });
}
