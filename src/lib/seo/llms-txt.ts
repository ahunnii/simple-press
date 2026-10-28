import { formatEventDate } from "~/lib/events/format";
import { formatPrice } from "~/lib/prices";
import { safeHref } from "~/lib/safe-href";
import { firstNonBlank } from "~/lib/seo/blank";
import { toMetaDescription } from "~/lib/seo/meta-description";
import { isSeoRouteEnabled, SEO_PATHS } from "~/lib/seo/sitemap-entries";
import { parsePageMeta, STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";

/**
 * Pure builder for a store's `/llms.txt` (https://llmstxt.org) — a short
 * Markdown summary that AI answer engines can read instead of crawling the
 * whole storefront.
 *
 * Kept free of the database and request headers so the shape (which sections
 * appear, what is omitted when blank, the caps) is unit-testable; the route in
 * `src/app/llms.txt/route.ts` only loads rows and calls this.
 *
 * Route gating reuses `isSeoRouteEnabled` from the sitemap so llms.txt can
 * never advertise a URL the storefront would `notFound()`. On top of the flag,
 * an index page is only listed when it has something to show (same rule the
 * sitemap applies to services / events / videos / FAQ, extended here to shop,
 * collections, blog and testimonials since a summary for a machine reader
 * should not point at empty pages).
 */

export const LLMS_PRODUCT_CAP = 50;
export const LLMS_EVENT_CAP = 20;
export const LLMS_FAQ_CAP = 30;
export const LLMS_SERVICE_CAP = 50;
export const LLMS_PAGE_CAP = 50;
const LLMS_FAQ_ANSWER_MAX = 1200;
const LLMS_BLURB_MAX = 200;

export interface LlmsProduct {
  name: string;
  slug: string;
  /** Effective price in CENTS (see `getEffectivePrice`). */
  price: number;
  excerpt?: string | null;
  description?: string | null;
}

export interface LlmsEvent {
  name: string;
  slug: string;
  startAt: Date;
  endAt?: Date | null;
  allDay: boolean;
  location?: string | null;
  blurb?: string | null;
}

export interface LlmsService {
  name: string;
  slug: string;
  /** SEO description; wins over `description` when non-blank. */
  metaDescription?: string | null;
  description?: string | null;
}

/** A published custom CMS page (not a blog post or policy). */
export interface LlmsPage {
  title: string;
  slug: string;
  /** SEO description; wins over `excerpt` when non-blank. */
  metaDescription?: string | null;
  excerpt?: string | null;
}

export interface LlmsFaq {
  question: string;
  answer: string;
}

export interface LlmsTxtInput {
  /** Canonical origin with no trailing slash, e.g. `https://shop.example.com`. */
  baseUrl: string;
  name: string;
  /** `SiteContent.metaDescription`. */
  description?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  areaServed?: string[] | null;
  supportEmail?: string | null;
  /** Raw `SiteContent.socialLinks` JSON. */
  socialLinks?: unknown;
  /** Raw `SiteContent.pageMeta` JSON. */
  pageMeta?: unknown;
  /** IANA zone used to render event dates. */
  timeZone: string;
  isEnabled: (key: string) => boolean;
  /** Published rows, already sorted; the builder applies the caps. */
  products: LlmsProduct[];
  /** Upcoming only (published, not archived, not over). */
  events: LlmsEvent[];
  faqs: LlmsFaq[];
  /** Published services, in display order; listed when the `services` flag is on. */
  services?: LlmsService[];
  /** Published custom pages, in display order (no flag governs these). */
  pages?: LlmsPage[];
  counts?: {
    collections?: number;
    blogPosts?: number;
    testimonials?: number;
    services?: number;
    videos?: number;
  };
}

/** Collapse all whitespace (incl. newlines) so a value can't break a list line. */
function oneLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Link text must not contain bare brackets or it ends the label early. */
function linkText(value: string): string {
  return oneLine(value).replace(/\[/g, "(").replace(/\]/g, ")");
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function link(label: string, url: string, note?: string | null): string {
  const base = `- [${linkText(label)}](${url})`;
  return note ? `${base}: ${note}` : base;
}

function profilesFrom(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const value of Object.values(raw as Record<string, unknown>)) {
    const href = safeHref(value);
    if (href !== null && /^https?:\/\//i.test(href)) seen.add(href);
  }
  return [...seen];
}

function locationFrom(input: LlmsTxtInput): string | null {
  const place = [
    firstNonBlank(input.addressCity),
    firstNonBlank(input.addressState),
  ]
    .filter((p): p is string => p !== undefined)
    .join(", ");
  const area = (input.areaServed ?? [])
    .map((a) => oneLine(a))
    .filter((a) => a.length > 0)
    .join(", ");

  if (place && area) return `${place} (serves ${area})`;
  if (place) return place;
  if (area) return area;
  return null;
}

export function buildLlmsTxt(input: LlmsTxtInput): string {
  const { baseUrl, isEnabled } = input;
  const counts = input.counts ?? {};
  const pageMeta = parsePageMeta(input.pageMeta);
  const lines: string[] = [];

  lines.push(`# ${oneLine(input.name)}`);

  const description = firstNonBlank(oneLine(input.description));
  if (description) {
    lines.push("", `> ${description}`);
  }

  const facts: string[] = [];
  const location = locationFrom(input);
  if (location) facts.push(`- Location: ${location}`);
  const email = firstNonBlank(input.supportEmail);
  if (email) facts.push(`- Contact: ${oneLine(email)}`);
  const profiles = profilesFrom(input.socialLinks);
  if (profiles.length > 0) facts.push(`- Profiles: ${profiles.join(", ")}`);
  if (facts.length > 0) lines.push("", ...facts);

  // ─── Pages ────────────────────────────────────────────────────────────────

  const products = input.products.slice(0, LLMS_PRODUCT_CAP);
  const events = input.events.slice(0, LLMS_EVENT_CAP);
  const services = (input.services ?? []).slice(0, LLMS_SERVICE_CAP);
  const cmsPages = (input.pages ?? []).slice(0, LLMS_PAGE_CAP);
  const faqs = input.faqs.filter(
    (f) => oneLine(f.question).length > 0 && oneLine(f.answer).length > 0,
  );

  /** Whether a route has anything worth listing (flag AND content). */
  const hasContent: Record<string, boolean> = {
    shop: input.products.length > 0,
    collections: (counts.collections ?? 0) > 0,
    blog: (counts.blogPosts ?? 0) > 0,
    testimonials: (counts.testimonials ?? 0) > 0,
    services: (input.services?.length ?? 0) > 0 || (counts.services ?? 0) > 0,
    videos: (counts.videos ?? 0) > 0,
    events: input.events.length > 0,
    faq: faqs.length > 0,
  };

  // Presentation order, not STATIC_SEO_ROUTES order: commerce first, then
  // who-we-are, then support.
  const ORDER = [
    "shop",
    "collections",
    "services",
    "events",
    "videos",
    "blog",
    "about",
    "testimonials",
    "faq",
    "contact",
    "donate",
  ] as const;

  const pageLines: string[] = [link("Home", baseUrl)];
  for (const key of ORDER) {
    const route = STATIC_SEO_ROUTES.find((r) => r.key === key);
    if (!route) continue;
    if (!isSeoRouteEnabled(isEnabled, route.key)) continue;
    if (key in hasContent && !hasContent[key]) continue;

    const entry = pageMeta[route.key];
    pageLines.push(
      link(
        firstNonBlank(entry?.title) ?? route.label,
        `${baseUrl}${route.path}`,
        firstNonBlank(oneLine(entry?.description)),
      ),
    );
  }
  lines.push("", "## Pages", ...pageLines);

  // ─── Services ─────────────────────────────────────────────────────────────

  if (isSeoRouteEnabled(isEnabled, "services") && services.length > 0) {
    lines.push("", "## Services");
    for (const svc of services) {
      const blurb = toMetaDescription(
        firstNonBlank(svc.metaDescription, svc.description),
        LLMS_BLURB_MAX,
      );
      lines.push(
        link(svc.name, `${baseUrl}${SEO_PATHS.service(svc.slug)}`, blurb),
      );
    }
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  if (isSeoRouteEnabled(isEnabled, "shop") && products.length > 0) {
    lines.push("", "## Products");
    for (const p of products) {
      const blurb = toMetaDescription(firstNonBlank(p.excerpt, p.description));
      const price = formatPrice(p.price);
      const note = blurb ? `${price} — ${blurb}` : price;
      lines.push(link(p.name, `${baseUrl}${SEO_PATHS.product(p.slug)}`, note));
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  if (isSeoRouteEnabled(isEnabled, "events") && events.length > 0) {
    lines.push("", "## Events");
    for (const e of events) {
      const when = formatEventDate(e, input.timeZone);
      const where = firstNonBlank(oneLine(e.location));
      const blurb = toMetaDescription(e.blurb, LLMS_BLURB_MAX);
      const head = where ? `${when}, ${where}` : when;
      const note = blurb ? `${head} — ${blurb}` : head;
      lines.push(link(e.name, `${baseUrl}${SEO_PATHS.event(e.slug)}`, note));
    }
  }

  // ─── Custom pages ─────────────────────────────────────────────────────────

  if (cmsPages.length > 0) {
    lines.push("", "## More pages");
    for (const pg of cmsPages) {
      const blurb = toMetaDescription(
        firstNonBlank(pg.metaDescription, pg.excerpt),
        LLMS_BLURB_MAX,
      );
      lines.push(
        link(pg.title, `${baseUrl}${SEO_PATHS.cmsPage(pg.slug)}`, blurb),
      );
    }
  }

  // ─── FAQ ──────────────────────────────────────────────────────────────────

  const faqRows = faqs.slice(0, LLMS_FAQ_CAP);
  if (faqRows.length > 0) {
    lines.push("", "## FAQ");
    for (const f of faqRows) {
      lines.push(
        "",
        `### ${oneLine(f.question)}`,
        truncate(
          f.answer
            .replace(/\r\n?/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim(),
          LLMS_FAQ_ANSWER_MAX,
        ),
      );
    }
  }

  return `${lines.join("\n")}\n`;
}
