/**
 * Template-field ("page sections") rendering.
 *
 * `SiteContent.customFields` holds the words and pictures of the storefront
 * template (homepage hero, about copy, contact blurb, …). The template's field
 * registry says which page/group each key belongs to and how to label it; this
 * module turns saved values into "Section → Field label → value" tables.
 *
 * Two phases so document paths (needed for relative image links) can be chosen
 * after the content is known:
 *   1. `selectFieldPages`  — pure data: which pages/groups/fields have content
 *   2. `renderFieldPage`   — HTML for one page, given its doc path
 *
 * Only values the owner actually saved are listed. Text left at the template's
 * built-in wording is not stored anywhere, so it is not exported.
 */
import { esc, fieldTable, hrefTo } from "../html";
import {
  fileNameOf,
  humanize,
  imgHtml,
  inlineText,
  linkHtml,
  mediaHref,
  plainTextHtml,
  richTextHtml,
  tableHtml,
} from "./shared";
import type { FieldDef, FieldRegistry, RenderCtx } from "./types";

const SP_META_KEY = "_sp";
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;

// ─── Emptiness ───────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const LEAF_NODES = new Set([
  "image",
  "video",
  "gallery",
  "embed",
  "form",
  "quoteCalculator",
  "horizontalRule",
]);

function tiptapHasContent(node: unknown): boolean {
  if (!isRecord(node)) return false;
  if (typeof node.type === "string" && LEAF_NODES.has(node.type)) return true;
  if (typeof node.text === "string" && node.text.trim() !== "") return true;
  return Array.isArray(node.content) && node.content.some(tiptapHasContent);
}

function parseJsonish(value: unknown): unknown {
  if (isRecord(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return null;
}

function isBlankScalar(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function rowHasContent(row: unknown): boolean {
  if (!isRecord(row)) return false;
  return Object.entries(row).some(
    ([k, v]) =>
      k !== "_id" && !isBlankScalar(v) && !(Array.isArray(v) && v.length === 0),
  );
}

export function isEmptyFieldValue(def: FieldDef, value: unknown): boolean {
  if (def.type === "richtext") return !tiptapHasContent(parseJsonish(value));
  if (def.type === "list" || def.type === "faq") {
    return (
      !Array.isArray(value) ||
      !value.some((r) =>
        typeof r === "string" ? r.trim() !== "" : rowHasContent(r),
      )
    );
  }
  if (Array.isArray(value)) return value.length === 0;
  if (isRecord(value)) return Object.keys(value).length === 0;
  return isBlankScalar(value);
}

// ─── Selection (phase 1) ─────────────────────────────────────────────────────

export interface SelectedField {
  def: FieldDef;
  value: unknown;
}

export interface SelectedGroup {
  id: string;
  title: string;
  fields: SelectedField[];
}

export interface SelectedPage {
  /** Registry page key ("homepage"), or "other". */
  page: string;
  /** Display title of the document, e.g. "Home page sections". */
  title: string;
  /** Optional lead-in note shown under the title. */
  note?: string;
  groups: SelectedGroup[];
}

const PAGE_ORDER = ["homepage", "about", "contact"];

/** "Homepage" → "Home page sections", "Global" → "Site-wide sections". */
export function pageDocTitle(page: string, pageTitle: string): string {
  if (page === "homepage") return "Home page sections";
  if (page === "global") return "Site-wide sections";
  return `${pageTitle} page sections`;
}

function inferType(value: unknown): string {
  if (Array.isArray(value)) return "list";
  if (isRecord(value) && value.type === "doc") return "richtext";
  if (
    typeof value === "string" &&
    IMAGE_EXT_RE.test(value) &&
    /^(https?:)?\/\/|^\//.test(value)
  ) {
    return "image";
  }
  return "text";
}

function inferListSchema(
  rows: unknown[],
): Array<{ key: string; label: string; type: string }> {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    for (const [k, v] of Object.entries(row)) {
      if (k === "_id" || seen.has(k)) continue;
      seen.set(k, inferType(v) === "image" ? "image" : "text");
    }
  }
  return [...seen].map(([key, type]) => ({ key, label: humanize(key), type }));
}

function lastSegment(key: string): string {
  return key.split(".").pop() ?? key;
}

/**
 * Pick the fields with content and group them by page and group, in registry
 * order. Keys the registry doesn't declare are gathered into an "Other saved
 * content" page so nothing the owner typed is silently dropped.
 */
export function selectFieldPages(
  registry: FieldRegistry,
  customFields: unknown,
): SelectedPage[] {
  const values = isRecord(customFields) ? customFields : {};
  const declared = new Set(registry.fields.map((f) => f.key));

  const pages = new Map<string, Map<string, SelectedField[]>>();
  for (const def of registry.fields) {
    const value = values[def.key];
    if (isEmptyFieldValue(def, value)) continue;
    const page = def.page ?? "global";
    const group = def.group ?? "ungrouped";
    const byGroup = pages.get(page) ?? new Map<string, SelectedField[]>();
    const list = byGroup.get(group) ?? [];
    list.push({ def, value });
    byGroup.set(group, list);
    pages.set(page, byGroup);
  }

  const pageKeys = [...pages.keys()]
    .map((key, i) => ({ key, i }))
    .sort((a, b) => {
      const ia = PAGE_ORDER.indexOf(a.key);
      const ib = PAGE_ORDER.indexOf(b.key);
      const ra = ia === -1 ? PAGE_ORDER.length : ia;
      const rb = ib === -1 ? PAGE_ORDER.length : ib;
      return ra - rb || a.i - b.i;
    })
    .map((p) => p.key);

  const out: SelectedPage[] = pageKeys.map((page) => {
    const byGroup = pages.get(page)!;
    const pageTitle = registry.pageTitles[page] ?? humanize(page);
    return {
      page,
      title: pageDocTitle(page, pageTitle),
      groups: [...byGroup].map(([id, fields]) => ({
        id,
        title:
          registry.groupTitles[id] ??
          (id === "ungrouped" ? "Other settings" : humanize(lastSegment(id))),
        fields,
      })),
    };
  });

  // Everything else the owner saved.
  const extras = new Map<string, SelectedField[]>();
  for (const [key, value] of Object.entries(values)) {
    if (key === SP_META_KEY || declared.has(key)) continue;
    if (registry.retiredKeys?.has(key)) continue;
    const type = inferType(value);
    const def: FieldDef = {
      key,
      label: humanize(lastSegment(key)),
      type,
      ...(type === "list" ? { itemSchema: inferListSchema(value as unknown[]) } : {}),
    };
    if (isEmptyFieldValue(def, value)) continue;
    const segments = key.split(".");
    const prefix =
      segments.length > 1
        ? segments.slice(0, -1).map(humanize).join(" › ")
        : "Other";
    const list = extras.get(prefix) ?? [];
    list.push({ def, value });
    extras.set(prefix, list);
  }
  if (extras.size > 0) {
    out.push({
      page: "other",
      title: "Other saved content",
      note: registry.resolved
        ? "Text and images saved on your site that the current template does not display (for example from a template you used earlier). They are listed here so nothing is lost."
        : "This template's field names could not be matched to labels, so everything saved on your site is listed here, grouped by the technical name of each field.",
      groups: [...extras].map(([title, fields]) => ({
        id: title,
        title,
        fields,
      })),
    });
  }
  return out;
}

// ─── Rendering (phase 2) ─────────────────────────────────────────────────────

function thumb(
  ctx: RenderCtx,
  docPath: string,
  url: string,
  alt: string,
  maxWidth: number,
): string {
  return imgHtml(ctx, docPath, url, alt, maxWidth);
}

function safeColor(value: string): string | null {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : null;
}

function mediaLink(ctx: RenderCtx, docPath: string, url: string): string {
  const href = mediaHref(ctx, docPath, url);
  const label = fileNameOf(url);
  if (!href) return esc(label);
  return `<a href="${esc(href)}">${esc(label)}</a>`;
}

function renderScalar(
  type: string,
  label: string,
  value: unknown,
  ctx: RenderCtx,
  docPath: string,
  compact: boolean,
): string {
  if (isBlankScalar(value)) return "";
  const text = typeof value === "string" ? value.trim() : String(value);
  switch (type) {
    case "image": {
      const img = thumb(ctx, docPath, text, label, compact ? 96 : 280);
      return compact
        ? img
        : `${img}<div class="muted">${esc(fileNameOf(text))}</div>`;
    }
    case "video":
      return mediaLink(ctx, docPath, text);
    case "url":
      // Site-relative links ("/shop") only work on the live site; point them
      // at it so they don't dangle inside the export folder.
      return linkHtml(
        /^\/(?!\/)/.test(text) ? `${ctx.business.siteUrl}${text}` : text,
        text,
      );
    case "color": {
      const c = safeColor(text);
      return c
        ? `<span style="display:inline-block;width:14px;height:14px;border:1px solid #999;vertical-align:middle;background:${esc(c)}"></span> <code>${esc(c)}</code>`
        : esc(text);
    }
    case "boolean":
      return text === "true" ? "Yes" : "No";
    case "textarea":
      return compact ? inlineText(text) : plainTextHtml(text);
    default:
      return inlineText(text);
  }
}

function refName(
  map: Map<string, { name: string; path?: string }> | undefined,
  id: string,
  docPath: string,
  fallback: string,
): string {
  const ref = map?.get(id);
  if (!ref) return esc(fallback);
  return ref.path
    ? `<a href="${esc(hrefTo(docPath, ref.path))}">${esc(ref.name)}</a>`
    : esc(ref.name);
}

/** "Estimate Quote request → Balloon colors" for a `"<formId>:<fieldId>"` value. */
function formPictureName(ctx: RenderCtx, value: string): string {
  const colon = value.indexOf(":");
  const formId = colon > 0 ? value.slice(0, colon) : value;
  const fieldId = colon > 0 ? value.slice(colon + 1) : "";
  const form = ctx.refs?.forms?.get(formId);
  if (!form) return esc("A question on one of your forms");
  const field = form.fields.get(fieldId);
  return esc(field ? `${form.name} → ${field}` : form.name);
}

function renderList(
  def: FieldDef,
  rows: unknown[],
  ctx: RenderCtx,
  docPath: string,
): string {
  const objectRows = rows.filter(rowHasContent) as Array<Record<string, unknown>>;
  if (objectRows.length === 0) return "";
  const schema = [...(def.itemSchema ?? [])];
  const known = new Set(schema.map((s) => s.key));
  for (const s of inferListSchema(objectRows)) {
    if (!known.has(s.key)) schema.push(s);
  }
  const columns = schema.filter((col) =>
    objectRows.some((r) => !isBlankScalar(r[col.key])),
  );
  if (columns.length === 0) return "";
  return tableHtml(
    ["#", ...columns.map((c) => c.label)],
    objectRows.map((row, i) => [
      String(i + 1),
      ...columns.map((c) =>
        renderScalar(c.type, c.label, row[c.key], ctx, docPath, true),
      ),
    ]),
  );
}

export interface RenderedField {
  label: string;
  html: string;
  /** Tables / rich text go under their own heading instead of in the two-column table. */
  block: boolean;
}

export function renderFieldValue(
  def: FieldDef,
  value: unknown,
  ctx: RenderCtx,
  docPath: string,
): RenderedField | null {
  if (isEmptyFieldValue(def, value)) return null;
  const label = def.label;
  switch (def.type) {
    case "richtext": {
      const html = richTextHtml(ctx, docPath, parseJsonish(value)).html;
      return html ? { label, html, block: true } : null;
    }
    case "list": {
      const html = renderList(def, value as unknown[], ctx, docPath);
      return html ? { label, html, block: true } : null;
    }
    case "faq": {
      const rows = value as unknown[];
      if (rows.every((r) => typeof r === "string")) {
        const items = rows
          .map((id) => ctx.refs?.faqs.get(id)?.question)
          .filter((q): q is string => Boolean(q))
          .map((q) => `<li>${esc(q)}</li>`);
        return items.length > 0
          ? { label, html: `<ul>${items.join("")}</ul>`, block: false }
          : null;
      }
      // Legacy { question, answer } rows.
      const html = tableHtml(
        ["Question", "Answer"],
        rows.filter(isRecord).map((r) => [
          inlineText(typeof r.question === "string" ? r.question : ""),
          plainTextHtml(typeof r.answer === "string" ? r.answer : ""),
        ]),
      );
      return html ? { label, html, block: true } : null;
    }
    case "gallery":
      return {
        label,
        html: refName(ctx.refs?.galleries, String(value), docPath, "A saved photo gallery"),
        block: false,
      };
    case "collection":
      return {
        label,
        html: refName(ctx.refs?.collections, String(value), docPath, "A product collection"),
        block: false,
      };
    case "formpicture":
      return { label, html: formPictureName(ctx, String(value)), block: false };
    case "iframe": {
      const parsed = parseJsonish(value);
      if (!isRecord(parsed) || typeof parsed.src !== "string") return null;
      const title =
        typeof parsed.title === "string" && parsed.title
          ? ` (${esc(parsed.title)})`
          : "";
      return {
        label,
        html: `Embedded content: ${linkHtml(parsed.src)}${title}`,
        block: false,
      };
    }
    default: {
      const html = renderScalar(def.type, label, value, ctx, docPath, false);
      return html ? { label, html, block: false } : null;
    }
  }
}

function renderGroup(group: SelectedGroup, ctx: RenderCtx, docPath: string): string {
  const parts: string[] = [];
  let run: Array<[string, string]> = [];
  const flush = () => {
    if (run.length > 0) parts.push(fieldTable(run));
    run = [];
  };
  for (const { def, value } of group.fields) {
    const rendered = renderFieldValue(def, value, ctx, docPath);
    if (!rendered) continue;
    if (rendered.block) {
      flush();
      parts.push(`<h3>${esc(rendered.label)}</h3>${rendered.html}`);
    } else {
      run.push([rendered.label, rendered.html]);
    }
  }
  flush();
  const body = parts.join("");
  return body ? `<h2>${esc(group.title)}</h2>${body}` : "";
}

/** Body HTML for one page of template fields. */
export function renderFieldPage(
  page: SelectedPage,
  ctx: RenderCtx,
  docPath: string,
): string {
  const intro = page.note ? `<p class="muted">${esc(page.note)}</p>` : "";
  return intro + page.groups.map((g) => renderGroup(g, ctx, docPath)).join("");
}

/** Build field definitions for keys no registry describes (labels from the key). */
export function inferFieldDefs(customFields: unknown): FieldDef[] {
  if (!isRecord(customFields)) return [];
  return Object.entries(customFields)
    .filter(([key]) => key !== SP_META_KEY)
    .map(([key, value]) => {
      const type = inferType(value);
      return {
        key,
        label: humanize(lastSegment(key)),
        type,
        ...(type === "list"
          ? { itemSchema: inferListSchema(value as unknown[]) }
          : {}),
      };
    });
}

/**
 * Render a flat list of fields, grouped by `def.group` (used for per-service
 * page fields). Fields without a registry definition fall back to inferred
 * labels so saved content is never dropped.
 */
export function renderFieldList(
  fields: FieldDef[],
  customFields: unknown,
  ctx: RenderCtx,
  docPath: string,
  groupTitles: Record<string, string> = {},
): string {
  const values = isRecord(customFields) ? customFields : {};
  const known = new Set(fields.map((f) => f.key));
  const all = [
    ...fields,
    ...inferFieldDefs(values).filter((d) => !known.has(d.key)),
  ];
  const groups = new Map<string, SelectedField[]>();
  for (const def of all) {
    const value = values[def.key];
    if (isEmptyFieldValue(def, value)) continue;
    const id = def.group ?? "content";
    const list = groups.get(id) ?? [];
    list.push({ def, value });
    groups.set(id, list);
  }
  return [...groups]
    .map(([id, selected]) =>
      renderGroup(
        {
          id,
          title:
            groupTitles[id] ??
            (id === "content" ? "Page content" : humanize(lastSegment(id))),
          fields: selected,
        },
        ctx,
        docPath,
      ),
    )
    .join("");
}
