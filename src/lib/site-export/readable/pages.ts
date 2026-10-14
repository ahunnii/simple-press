/**
 * Readable documents for CMS pages (about, policies, custom pages), the
 * template "page sections" docs, FAQ and Testimonials.
 */
import { esc, fieldTable, callout } from "../html";
import { SITE_EXPORT_DIRS } from "../types";
import {
  renderFieldPage,
  type SelectedPage,
} from "./fields";
import {
  docLink,
  formatDate,
  imgHtml,
  indexDoc,
  inlineText,
  linkHtml,
  photosGridHtml,
  plainTextHtml,
  richTextHtml,
  seoRows,
  shell,
  uniq,
} from "./shared";
import type {
  FaqInput,
  PageInput,
  RenderCtx,
  TestimonialInput,
} from "./types";

export const PAGES_INDEX_PATH = `${SITE_EXPORT_DIRS.pages}/index.html`;
const PAGES_CRUMB = { label: "Pages", zipPath: PAGES_INDEX_PATH };

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  policy: "Policy page",
  custom: "Custom page",
  blog: "Blog post",
};

export function pageTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? "Page";
}

/** Interactive widgets don't survive a move; tell the owner plainly. */
export function widgetNotice(warnings: string[]): string {
  const kinds = uniq(
    warnings.flatMap((w) => {
      if (/form node/i.test(w)) return ["a contact/sign-up form"];
      if (/quote calculator/i.test(w)) return ["a quote calculator"];
      return [];
    }),
  );
  if (kinds.length === 0) return "";
  return callout(
    `<strong>Re-create by hand:</strong> this page contains ${esc(kinds.join(" and "))}. Interactive widgets can't be exported, so you'll need to add an equivalent with your new site builder. Look for the bracketed "[…]" notes in the text below to see where it sat.`,
    "warn",
  );
}

function liveAddress(ctx: RenderCtx, path: string): string {
  const url = `${ctx.business.siteUrl}${path}`;
  return linkHtml(url);
}

export function renderPageDoc(
  page: PageInput,
  ctx: RenderCtx,
  docPath: string,
): string {
  const tz = ctx.timeZone;
  const { html, warnings } = richTextHtml(ctx, docPath, page.content);
  const meta = fieldTable([
    ["Page title", esc(page.title)],
    ["Type", esc(pageTypeLabel(page.type))],
    ["Status", page.published ? "Published" : "Draft (not visible on your site)"],
    ["Address on your site", liveAddress(ctx, `/${page.slug}`)],
    ["Short summary", inlineText(page.excerpt)],
    ["Last published", page.publishedAt ? esc(formatDate(page.publishedAt, tz)) : ""],
    ...seoRows(page),
    ["Social share image", page.ogImage ? imgHtml(ctx, docPath, page.ogImage, "") : ""],
  ]);
  const featured = page.image
    ? `<h2>Main image</h2>${photosGridHtml(ctx, docPath, [{ url: page.image, alt: page.title }])}`
    : "";
  const body = html
    ? `<h2>Page content</h2>${widgetNotice(warnings)}<div class="rich">${html}</div>`
    : `<p class="muted">This page has no text content.</p>`;
  return shell(ctx, {
    docPath,
    title: page.title,
    subtitle: pageTypeLabel(page.type),
    breadcrumbs: [PAGES_CRUMB, { label: page.title }],
    bodyHtml: meta + featured + body,
  });
}

export function renderPagesIndex(
  entries: Array<{ page: PageInput; path: string }>,
  extra: Array<{ title: string; path: string; kind: string }>,
  ctx: RenderCtx,
): string {
  const rows = [
    ...extra.map((e) => [
      docLink(PAGES_INDEX_PATH, e.path, e.title),
      esc(e.kind),
      "",
    ]),
    ...entries.map(({ page, path }) => [
      docLink(PAGES_INDEX_PATH, path, page.title),
      esc(pageTypeLabel(page.type)),
      page.published ? "Published" : "Draft",
    ]),
  ];
  return indexDoc(ctx, {
    docPath: PAGES_INDEX_PATH,
    title: "Pages",
    intro:
      "Each page of your website, with its text, images and search-engine details laid out so you can copy and paste into your new site.",
    headers: ["Page", "Kind", "Status"],
    rows,
    breadcrumbs: [{ label: "Pages" }],
  });
}

/** A template "page sections" document (Home page sections, About page sections, …). */
export function renderFieldsDoc(
  selected: SelectedPage,
  ctx: RenderCtx,
  docPath: string,
): string {
  const intro =
    selected.page === "other"
      ? ""
      : `<p>These are the headlines, paragraphs, buttons and pictures you entered for this part of your website's design. Each block below is a section of the page, in the order it appears. Only things you filled in are listed; anything left at the design's standard wording is not here.</p>`;
  return shell(ctx, {
    docPath,
    title: selected.title,
    breadcrumbs: [PAGES_CRUMB, { label: selected.title }],
    bodyHtml: intro + renderFieldPage(selected, ctx, docPath),
  });
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export function renderFaqDoc(
  items: FaqInput[],
  ctx: RenderCtx,
  docPath: string,
): string {
  const render = (list: FaqInput[]) =>
    list
      .map(
        (f, i) =>
          `<h3>${i + 1}. ${esc(f.question)}</h3>${plainTextHtml(f.answer)}`,
      )
      .join("");
  const published = items.filter((i) => i.published);
  const hidden = items.filter((i) => !i.published);
  const body =
    render(published) +
    (hidden.length > 0
      ? `<h2>Not shown on your site</h2><p class="muted">These questions are saved but switched off.</p>${render(hidden)}`
      : "");
  return shell(ctx, {
    docPath,
    title: "Frequently asked questions",
    subtitle: `${published.length} question${published.length === 1 ? "" : "s"} shown on your site`,
    breadcrumbs: [PAGES_CRUMB, { label: "FAQ" }],
    bodyHtml: body,
  });
}

// ─── Testimonials ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TestimonialInput["status"], string> = {
  PUBLISHED: "Shown on your site",
  PENDING: "Waiting for approval",
  HIDDEN: "Hidden",
};

export function renderTestimonialsDoc(
  items: TestimonialInput[],
  ctx: RenderCtx,
  docPath: string,
): string {
  const body = items
    .map((t) => {
      const who = [t.customerName, t.customerTitle, t.customerCompany]
        .filter((p): p is string => Boolean(p?.trim()))
        .map(esc)
        .join(", ");
      return [
        `<h3>${esc(t.title?.trim() ? t.title.trim() : t.customerName)}</h3>`,
        `<blockquote>${plainTextHtml(t.text)}</blockquote>`,
        photosGridHtml(
          ctx,
          docPath,
          t.photoUrls.map((url) => ({ url, alt: `Photo from ${t.customerName}` })),
        ),
        fieldTable([
          ["Name and role", who],
          ["Date", esc(formatDate(t.testimonialDate, ctx.timeZone))],
          ["Status", esc(STATUS_LABEL[t.status])],
        ]),
      ].join("");
    })
    .join("");
  return shell(ctx, {
    docPath,
    title: "Testimonials",
    subtitle: `${items.length} testimonial${items.length === 1 ? "" : "s"}`,
    breadcrumbs: [PAGES_CRUMB, { label: "Testimonials" }],
    bodyHtml: body,
  });
}
