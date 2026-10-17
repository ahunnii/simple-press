import type {
  SiteSearchGroup,
  SiteSearchItem,
  SiteSearchResult,
  SiteSearchType,
} from "./site-search-types";
import type { DbClient } from "~/server/db";
import { buildBlogSearchBlob, extractTiptapLikeText } from "~/lib/blog-search";
import { formatEventDate } from "~/lib/events/format";
import { upcomingEventWhere } from "~/lib/events/query";
import { routeEnabled } from "~/lib/features/route-flags";
import { formatProductDisplayPrice } from "~/lib/prices";
import { isReservedPageSlug } from "~/lib/reserved-page-slugs";
import { db as defaultDb } from "~/server/db";

import {
  SITE_SEARCH_MAX_LENGTH,
  SITE_SEARCH_MIN_LENGTH,
  SITE_SEARCH_TYPE_LABELS,
} from "./site-search-types";

/**
 * Storefront site search (flag `siteSearch`). Plain Postgres `contains` at
 * query time, scoped by `businessId`, published-only, with the ranking and
 * snippets done in JS. Everything is behind `searchSite()` so a trigram/FTS
 * table can replace the internals later without touching callers.
 *
 * Visibility rules are copied from the PUBLIC procedures of each feature
 * (product/service/events/collections/faq/content routers) — keep them in sync.
 */

const MAX_WORDS = 5;
/** Rows pulled per DB-backed group before JS refinement/ranking/counting. */
const DB_FETCH_CAP = 100;
/** Same cap the plan sets for the pages/posts scan. */
const PAGES_FETCH_CAP = 500;
const SNIPPET_LENGTH = 140;

// ─── Normalization ────────────────────────────────────────────────────────────

/** Light plural trim: "dresses" → "dress", "candles" → "candle", "glass" stays. */
export function trimPlural(word: string): string {
  if (/(ses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

export type NormalizedSiteSearchQuery = {
  /** Display/"exact match" form: trimmed, whitespace-collapsed, clamped, ≤ 5 words. "" when too short. */
  q: string;
  /** Lower-cased, plural-trimmed words used for matching (all must match). */
  words: string[];
};

export function normalizeSiteSearchQuery(
  raw: string,
): NormalizedSiteSearchQuery {
  const collapsed = (raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SITE_SEARCH_MAX_LENGTH)
    .trim();
  if (collapsed.length < SITE_SEARCH_MIN_LENGTH) return { q: "", words: [] };

  const rawWords = collapsed.split(" ").slice(0, MAX_WORDS);
  return {
    q: rawWords.join(" "),
    words: rawWords.map((w) => trimPlural(w.toLowerCase())),
  };
}

// ─── Text helpers (pure) ──────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
};

/** HTML → plain text (tags dropped, common entities decoded, whitespace collapsed). */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return (
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      // Block-level tags separate words; inline ones (b, em, a…) must not.
      .replace(
        /<\/?(?:p|br|div|li|ul|ol|h[1-6]|tr|td|th|blockquote|section|article)\b[^>]*>/gi,
        " ",
      )
      .replace(/<[^>]*>/g, "")
      .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39|#x27);/gi, (m) => {
        return ENTITIES[m.toLowerCase()] ?? m;
      })
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** True when every word occurs in `text` (case-insensitive; `words` already lower-case). */
export function matchesAllWords(text: string, words: string[]): boolean {
  const hay = text.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * ~`max` chars of plain text around the first word hit in `text`, with
 * ellipses where it was cut. Returns undefined when there's no hit (unless
 * `fallbackToStart`, which returns the opening of the text instead).
 */
export function makeSnippet(
  text: string,
  words: string[],
  opts?: { max?: number; fallbackToStart?: boolean },
): string | undefined {
  const max = opts?.max ?? SNIPPET_LENGTH;
  const plain = text.replace(/\s+/g, " ").trim();
  if (!plain) return undefined;

  const lower = plain.toLowerCase();
  let hit = -1;
  for (const w of words) {
    if (!w) continue;
    const i = lower.indexOf(w);
    if (i !== -1 && (hit === -1 || i < hit)) hit = i;
  }
  if (hit === -1 && !opts?.fallbackToStart) return undefined;
  if (hit === -1) hit = 0;

  if (plain.length <= max) return plain;

  let start = Math.max(0, hit - Math.floor(max / 3));
  let end = Math.min(plain.length, start + max);
  start = Math.max(0, end - max);

  // Snap to word boundaries so we don't cut mid-word (never past the hit).
  if (start > 0) {
    const nextSpace = plain.indexOf(" ", start);
    if (nextSpace !== -1 && nextSpace < hit) start = nextSpace + 1;
  }
  if (end < plain.length) {
    const prevSpace = plain.lastIndexOf(" ", end);
    if (prevSpace > hit) end = prevSpace;
  }

  const body = plain.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${body}${end < plain.length ? "…" : ""}`;
}

/**
 * Title relevance: 0 exact, 1 starts with the query, 2 contains every word,
 * 3 body-only. Lower sorts first. Compares against both the typed query and
 * the plural-trimmed words so "dresses" still lands an exact hit on "Dress".
 */
export function rankTitle(
  title: string,
  norm: NormalizedSiteSearchQuery,
): 0 | 1 | 2 | 3 {
  const t = title.trim().toLowerCase();
  const typed = norm.q.toLowerCase();
  const trimmed = norm.words.join(" ");
  if (t === typed || t === trimmed) return 0;
  if (t.startsWith(typed) || t.startsWith(trimmed)) return 1;
  if (matchesAllWords(t, norm.words)) return 2;
  return 3;
}

// ─── Candidates ───────────────────────────────────────────────────────────────

type Candidate = {
  item: Omit<SiteSearchItem, "snippet">;
  /** Everything matchable, plain text, joined — every word must be found here. */
  searchText: string;
  /** Plain text the snippet is cut from. */
  bodyText: string;
  /** Always attach a snippet (FAQs: the answer is the useful part). */
  alwaysSnippet?: boolean;
};

/** Filter → rank (stable, ties keep fetch order) → count → top N with snippets. */
export function finishGroup(
  type: SiteSearchType,
  candidates: Candidate[],
  norm: NormalizedSiteSearchQuery,
  limit: number,
): SiteSearchGroup | null {
  const matched = candidates
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => matchesAllWords(c.searchText, norm.words))
    .map(({ c, index }) => ({
      c,
      index,
      rank: rankTitle(c.item.title, norm),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  if (matched.length === 0) return null;

  const items: SiteSearchItem[] = matched.slice(0, limit).map(({ c, rank }) => {
    const snippet =
      rank === 3 || c.alwaysSnippet
        ? makeSnippet(c.bodyText, norm.words, {
            fallbackToStart: c.alwaysSnippet,
          })
        : undefined;
    return snippet ? { ...c.item, snippet } : { ...c.item };
  });

  return {
    type,
    label: SITE_SEARCH_TYPE_LABELS[type],
    count: matched.length,
    items,
  };
}

// ─── Group ordering ───────────────────────────────────────────────────────────

const ORDER_PRODUCTS: SiteSearchType[] = [
  "products",
  "collections",
  "services",
  "pages",
  "events",
  "faqs",
];
const ORDER_SERVICES: SiteSearchType[] = [
  "services",
  "pages",
  "faqs",
  "events",
  "products",
  "collections",
];
const ORDER_INFORMATIONAL: SiteSearchType[] = [
  "pages",
  "events",
  "faqs",
  "services",
  "products",
  "collections",
];
const ORDER_DEFAULT: SiteSearchType[] = [
  "products",
  "services",
  "pages",
  "events",
  "faqs",
  "collections",
];

export function groupOrderForBusinessType(
  businessType: string | null | undefined,
): SiteSearchType[] {
  switch (businessType) {
    case "products":
      return ORDER_PRODUCTS;
    case "services":
      return ORDER_SERVICES;
    case "informational":
    case "donations":
      return ORDER_INFORMATIONAL;
    default:
      return ORDER_DEFAULT;
  }
}

/** Representative storefront path per group, for `routeEnabled`. FAQs have no flag. */
const GROUP_PATHS: Record<SiteSearchType, string | null> = {
  products: "/shop",
  collections: "/collections",
  services: "/services",
  events: "/events",
  faqs: null,
  pages: null, // gated per item (blog posts need `blog`)
};

// ─── Prisma where helpers ─────────────────────────────────────────────────────

/** Every word must match at least one of `fields` (case-insensitive contains). */
function everyWordMatchesAny<T extends string>(
  words: string[],
  fields: T[],
): Array<{ OR: Array<Record<T, { contains: string; mode: "insensitive" }>> }> {
  return words.map((w) => ({
    OR: fields.map(
      (f) =>
        ({ [f]: { contains: w, mode: "insensitive" } }) as Record<
          T,
          { contains: string; mode: "insensitive" }
        >,
    ),
  }));
}

// ─── Group loaders ────────────────────────────────────────────────────────────

type Ctx = {
  db: DbClient;
  businessId: string;
  norm: NormalizedSiteSearchQuery;
  timeZone?: string;
};

async function loadProducts({
  db,
  businessId,
  norm,
}: Ctx): Promise<Candidate[]> {
  const rows = await db.product.findMany({
    where: {
      businessId,
      published: true,
      AND: everyWordMatchesAny(norm.words, [
        "name",
        "excerpt",
        "description",
        "sku",
      ]),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      excerpt: true,
      description: true,
      sku: true,
      price: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: { select: { price: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: DB_FETCH_CAP,
  });

  return rows.map((p) => {
    const description = stripHtml(p.description);
    const excerpt = stripHtml(p.excerpt);
    const sku = p.sku ?? "";
    const skuOnlyHit =
      sku &&
      matchesAllWords(sku, norm.words) &&
      !matchesAllWords(p.name, norm.words);
    return {
      item: {
        id: p.id,
        type: "products",
        title: p.name,
        ...(skuOnlyHit ? { subtitle: `SKU ${sku}` } : {}),
        href: `/shop/${p.slug}`,
        ...(p.images[0]?.url ? { image: p.images[0].url } : {}),
        priceLabel: formatProductDisplayPrice(p),
      },
      searchText: [p.name, excerpt, description, sku].join("\n"),
      bodyText: [excerpt, description].filter(Boolean).join(" "),
    };
  });
}

async function loadCollections({
  db,
  businessId,
  norm,
}: Ctx): Promise<Candidate[]> {
  const rows = await db.collection.findMany({
    where: {
      businessId,
      published: true,
      AND: everyWordMatchesAny(norm.words, ["name", "description"]),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: {
        select: {
          // Published products only — same as `collections.getAllPublic`.
          collectionProducts: { where: { product: { published: true } } },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
    take: DB_FETCH_CAP,
  });

  return rows.map((c) => {
    const description = stripHtml(c.description);
    const n = c._count.collectionProducts;
    return {
      item: {
        id: c.id,
        type: "collections",
        title: c.name,
        subtitle: `${n} ${n === 1 ? "item" : "items"}`,
        href: `/collections/${c.slug}`,
        ...(c.imageUrl ? { image: c.imageUrl } : {}),
      },
      searchText: [c.name, description].join("\n"),
      bodyText: description,
    };
  });
}

async function loadServices({
  db,
  businessId,
  norm,
}: Ctx): Promise<Candidate[]> {
  const rows = await db.service.findMany({
    where: {
      businessId,
      published: true,
      // Each word must hit the service itself OR one of its published items.
      AND: norm.words.map((w) => ({
        OR: [
          { name: { contains: w, mode: "insensitive" as const } },
          { description: { contains: w, mode: "insensitive" as const } },
          {
            items: {
              some: {
                published: true,
                OR: [
                  { name: { contains: w, mode: "insensitive" as const } },
                  {
                    description: {
                      contains: w,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        ],
      })),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      items: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        take: 30,
        select: { name: true, description: true, priceLabel: true },
      },
    },
    orderBy: { sortOrder: "asc" },
    take: DB_FETCH_CAP,
  });

  return rows.map((s) => {
    const description = stripHtml(s.description);
    const itemTexts = s.items.map((i) =>
      [i.name, stripHtml(i.description)].filter(Boolean).join(" — "),
    );
    const prices = s.items
      .map((i) => i.priceLabel?.trim())
      .filter((p): p is string => !!p);
    const priceLabel =
      prices.length === 0
        ? undefined
        : prices.length === 1
          ? prices[0]
          : `from ${prices[0]}`;
    return {
      item: {
        id: s.id,
        type: "services",
        title: s.name,
        href: `/services/${s.slug}`,
        ...(s.image ? { image: s.image } : {}),
        ...(priceLabel ? { priceLabel } : {}),
      },
      searchText: [s.name, description, ...itemTexts].join("\n"),
      bodyText: [description, ...itemTexts].filter(Boolean).join(" · "),
    };
  });
}

async function loadEvents({
  db,
  businessId,
  norm,
  timeZone,
}: Ctx): Promise<Candidate[]> {
  const tzPromise = timeZone
    ? Promise.resolve(timeZone)
    : db.business
        .findUnique({ where: { id: businessId }, select: { timeZone: true } })
        .then((b) => b?.timeZone ?? "America/Detroit");

  const [rows, tz] = await Promise.all([
    db.event.findMany({
      // Not archived, published, and upcoming by `endAt ?? startAt` — the
      // exact rule `events.getUpcomingPublic` uses.
      where: {
        ...upcomingEventWhere(businessId, new Date()),
        AND: everyWordMatchesAny(norm.words, ["name", "blurb", "location"]),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        blurb: true,
        coverImage: true,
        startAt: true,
        endAt: true,
        allDay: true,
        location: true,
      },
      orderBy: [{ startAt: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
      take: DB_FETCH_CAP,
    }),
    tzPromise,
  ]);

  return rows.map((e) => {
    const blurb = stripHtml(e.blurb);
    const location = e.location?.trim() ?? "";
    let date = "";
    try {
      date = formatEventDate(e, tz);
    } catch {
      date = "";
    }
    const subtitle = [date, location].filter(Boolean).join(" · ");
    return {
      item: {
        id: e.id,
        type: "events",
        title: e.name,
        ...(subtitle ? { subtitle } : {}),
        href: `/events/${e.slug}`,
        ...(e.coverImage ? { image: e.coverImage } : {}),
      },
      searchText: [e.name, blurb, location].join("\n"),
      bodyText: blurb,
    };
  });
}

async function loadFaqs({ db, businessId, norm }: Ctx): Promise<Candidate[]> {
  const rows = await db.faqItem.findMany({
    where: {
      businessId,
      published: true,
      AND: everyWordMatchesAny(norm.words, ["question", "answer"]),
    },
    select: { id: true, question: true, answer: true },
    orderBy: { sortOrder: "asc" },
    take: DB_FETCH_CAP,
  });

  return rows.map((f) => {
    const answer = stripHtml(f.answer);
    return {
      item: {
        id: f.id,
        type: "faqs",
        title: f.question,
        // The FAQ templates render items without per-item anchors, so link
        // to the page itself.
        href: "/faq",
      },
      searchText: [f.question, answer].join("\n"),
      bodyText: answer,
      alwaysSnippet: true,
    };
  });
}

/** What `getPageBySlug` / the blog procedures would show — nothing else. */
async function loadPages(
  { db, businessId, norm }: Ctx,
  isEnabled: (key: string) => boolean,
): Promise<Candidate[]> {
  const blogOn = routeEnabled("/blog", isEnabled);
  const rows = await db.page.findMany({
    where: {
      businessId,
      published: true,
      ...(blogOn ? {} : { type: { not: "blog" } }),
    },
    // NEVER select previewDraft / previewDraftUpdatedAt — the visual-editor
    // draft must not be searchable or returned.
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      content: true,
      image: true,
    },
    orderBy: [
      { sortOrder: "asc" },
      { publishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: PAGES_FETCH_CAP,
  });

  const out: Candidate[] = [];
  for (const p of rows) {
    const isBlog = p.type === "blog";
    const href = isBlog ? `/blog/${p.slug}` : `/${p.slug}`;

    if (!routeEnabled(href, isEnabled)) continue;
    // Slugs a built-in route shadows are unreachable at `/<slug>` (the public
    // `[slug]` route has the lowest priority) — don't emit dead links.
    if (!isBlog && (p.slug === "search" || isReservedPageSlug(p.slug, p.type)))
      continue;
    if (!p.slug) continue;

    if (!matchesAllWords(buildBlogSearchBlob(p), norm.words)) continue;

    const bodyPlain = extractTiptapLikeText(p.content)
      .replace(/\s+/g, " ")
      .trim();
    // `[slug]/page.tsx` 404s a policy with no text.
    if (p.type === "policy" && !bodyPlain) continue;

    const excerpt = (p.excerpt ?? "").trim();
    out.push({
      item: {
        id: p.id,
        type: "pages",
        title: p.title,
        ...(isBlog
          ? { subtitle: "Blog post" }
          : p.type === "policy"
            ? { subtitle: "Policy" }
            : {}),
        href,
        ...(p.image ? { image: p.image } : {}),
      },
      // Already verified against the full blob above; keep the title + body
      // here so `finishGroup`'s re-check agrees with it.
      searchText: [
        p.title,
        p.slug,
        excerpt,
        p.type,
        p.metaTitle,
        p.metaDescription,
        p.metaKeywords,
        bodyPlain,
      ]
        .filter(Boolean)
        .join("\n"),
      bodyText: [excerpt, bodyPlain].filter(Boolean).join(" "),
    });
  }
  return out;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export type SearchSiteOptions = {
  businessId: string;
  q: string;
  /** From `resolveFlags` / `getBusinessFlags`. */
  isEnabled: (key: string) => boolean;
  /** `Business.businessType`: products | services | informational | donations | null. */
  businessType?: string | null;
  /** Dialog uses 3, the results page 24. */
  limitPerGroup: number;
  /** When set, only that group is searched. */
  type?: SiteSearchType;
  /** Business time zone for event dates; looked up when omitted. */
  timeZone?: string;
  /** Defaults to the shared client. */
  db?: DbClient;
};

const EMPTY: SiteSearchResult = { q: "", total: 0, groups: [] };

export async function searchSite(
  opts: SearchSiteOptions,
): Promise<SiteSearchResult> {
  const { businessId, isEnabled, businessType, type } = opts;
  if (!isEnabled("siteSearch")) return { ...EMPTY };

  const norm = normalizeSiteSearchQuery(opts.q);
  if (!norm.q) return { ...EMPTY };

  const limit = Math.max(1, Math.min(100, Math.floor(opts.limitPerGroup) || 1));
  const ctx: Ctx = {
    db: opts.db ?? defaultDb,
    businessId,
    norm,
    timeZone: opts.timeZone,
  };

  const order = groupOrderForBusinessType(businessType).filter((g) => {
    if (type && g !== type) return false;
    const path = GROUP_PATHS[g];
    return path === null || routeEnabled(path, isEnabled);
  });

  const loaders: Record<SiteSearchType, () => Promise<Candidate[]>> = {
    products: () => loadProducts(ctx),
    collections: () => loadCollections(ctx),
    services: () => loadServices(ctx),
    events: () => loadEvents(ctx),
    faqs: () => loadFaqs(ctx),
    pages: () => loadPages(ctx, isEnabled),
  };

  const loaded = await Promise.all(
    order.map(async (g) => ({
      type: g,
      candidates: await loaders[g](),
    })),
  );

  const groups = loaded
    .map(({ type: t, candidates }) => finishGroup(t, candidates, norm, limit))
    .filter((g): g is SiteSearchGroup => g !== null);

  return {
    q: norm.q,
    total: groups.reduce((sum, g) => sum + g.count, 0),
    groups,
  };
}
