import { parseTemplateListRows } from "~/lib/template-fields";

import { WEALTH_IMPACT_MAX } from "./index";

/**
 * Row shapes + parsers for the Impact Report's list fields.
 *
 * Split out of `./index.ts` on purpose: `parseTemplateListRows` is a RUNTIME
 * import from `~/lib/template-fields`, which aggregates every template's field
 * registry (including wealth's root `index.ts` → `./index.ts`). Keeping it in
 * the field module would recreate the circular-evaluation TDZ crash
 * documented in `../homepage/wealth-homepage-news.ts`.
 *
 * Every parser drops incomplete rows (no sample data ever ships; an empty
 * result hides the section) and keeps each row's ORIGINAL position as
 * `index`, so `listItemAttr(key, index)` points the editor at the right saved
 * row even when earlier rows were skipped.
 */

type Indexed = { id: string; index: number };

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function rowsOf(raw: unknown) {
  return parseTemplateListRows(raw).map((row, index) => ({
    row,
    index,
    id: typeof row._id === "string" && row._id ? row._id : `row-${index}`,
  }));
}

/** Splits a textarea into paragraphs on blank lines. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Splits a textarea into non-empty trimmed lines. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// ─── By the numbers ──────────────────────────────────────────────────────────

export type ImpactStat = Indexed & {
  value: string;
  caption: string;
  /** v2: ledger-row title ("" on v1 rows). */
  title: string;
  /** v2: ledger-row paragraph(s), `[N]` footnotes allowed ("" on v1 rows). */
  detail: string;
};

export function parseImpactStats(raw: unknown): ImpactStat[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      value: readString(row, "value"),
      caption: readString(row, "caption"),
      title: readString(row, "title"),
      detail: readString(row, "detail"),
    }))
    .filter((r) => r.value !== "")
    .slice(0, WEALTH_IMPACT_MAX.stats);
}

/** design.md v2 §8: ANY figure with a detail → ledger rows, else the grid. */
export function statsUseLedger(stats: ImpactStat[]): boolean {
  return stats.some((s) => s.detail !== "");
}

/**
 * Numeral-tile length step (design.md v2 "Approved with the mock"): 1–2
 * characters → "base", 3–4 → "mid", 5+ → "long". Counts user-perceived
 * characters (so "¢" or "½" count once) after trimming.
 */
export type NumeralSize = "base" | "mid" | "long";

export function numeralSize(value: string): NumeralSize {
  const length = Array.from(value.trim()).length;
  if (length <= 2) return "base";
  if (length <= 4) return "mid";
  return "long";
}

// ─── Programs ────────────────────────────────────────────────────────────────

export type ImpactProgram = Indexed & {
  label: string;
  title: string;
  /** v2: acronym for the hub tile ("" on v1 rows). */
  short: string;
  copy: string;
  image: string;
  imageAlt: string;
  statValue: string;
  statCaption: string;
  linkLabel: string;
  linkUrl: string;
};

export function parseImpactPrograms(raw: unknown): ImpactProgram[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      label: readString(row, "label"),
      title: readString(row, "title"),
      short: readString(row, "short"),
      copy: readString(row, "copy"),
      image: readString(row, "image"),
      imageAlt: readString(row, "imageAlt"),
      statValue: readString(row, "statValue"),
      statCaption: readString(row, "statCaption"),
      linkLabel: readString(row, "linkLabel"),
      linkUrl: readString(row, "linkUrl"),
    }))
    .filter((r) => r.title !== "")
    .slice(0, WEALTH_IMPACT_MAX.programs);
}

/**
 * How a program row renders below the hub (design.md v2 §7b):
 * - "row": has a photo → today's alternating photo/text row.
 * - "card": copy but no photo → a solid `WealthProgramCard` (2-up).
 * - "hub": title/short only → appears in the hub overview only.
 *
 * When the hub is NOT shown, a would-be "hub" row falls back to "card" so a
 * program the owner typed never silently disappears (v1 rendered title-only
 * rows as text rows).
 */
export type ImpactProgramLayout = "row" | "card" | "hub";

export function programLayout(
  p: Pick<ImpactProgram, "image" | "copy">,
  hubShown: boolean,
): ImpactProgramLayout {
  if (p.image) return "row";
  if (p.copy || !hubShown) return "card";
  return "hub";
}

/** The hub renders when its centre label is set and ≥3 programs exist. */
export function programsHubShown(hubLabel: string, count: number): boolean {
  return hubLabel.trim() !== "" && count >= 3;
}

/** Hub tile cell in the 3×3 grid (hub at the centre). */
export type HubPosition = "tl" | "tc" | "tr" | "r" | "br" | "bc" | "bl" | "l";

const HUB_POSITIONS: Record<number, HubPosition[]> = {
  1: ["tc"],
  2: ["tc", "bc"],
  3: ["tc", "br", "bl"],
  4: ["tl", "tr", "br", "bl"],
  5: ["tl", "tc", "tr", "br", "bl"],
  6: ["tl", "tr", "r", "br", "bl", "l"],
  7: ["tl", "tc", "tr", "r", "br", "bl", "l"],
  8: ["tl", "tc", "tr", "r", "br", "bc", "bl", "l"],
};

/**
 * Hub placement map (design.md v2 "Approved with the mock"), clockwise from
 * top-left. Counts above 8 are capped at 8; 0 → []. (1–2 are not used by the
 * hub, which needs ≥3, but return something sensible.)
 */
export function hubPositions(count: number): HubPosition[] {
  const n = Math.max(0, Math.min(8, Math.floor(count)));
  return n === 0 ? [] : [...(HUB_POSITIONS[n] ?? [])];
}

// ─── Co-op stories ───────────────────────────────────────────────────────────

export type ImpactStory = Indexed & {
  name: string;
  label: string;
  summary: string;
  image: string;
  imageAlt: string;
  url: string;
};

export function parseImpactStories(raw: unknown): ImpactStory[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      name: readString(row, "name"),
      label: readString(row, "label"),
      summary: readString(row, "summary"),
      image: readString(row, "image"),
      imageAlt: readString(row, "imageAlt"),
      url: readString(row, "url"),
    }))
    .filter((r) => r.name !== "")
    .slice(0, WEALTH_IMPACT_MAX.stories);
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export type ImpactGoal = Indexed & { title: string; line: string };

export function parseImpactGoals(raw: unknown): ImpactGoal[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      title: readString(row, "title"),
      line: readString(row, "line"),
    }))
    .filter((r) => r.title !== "")
    .slice(0, WEALTH_IMPACT_MAX.goals);
}

// ─── Thank you ───────────────────────────────────────────────────────────────

export type ImpactThanksColumn = Indexed & { heading: string; names: string[] };

export function parseImpactThanks(raw: unknown): ImpactThanksColumn[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      heading: readString(row, "heading"),
      names: splitLines(readString(row, "names")),
    }))
    .filter((r) => r.names.length > 0)
    .slice(0, WEALTH_IMPACT_MAX.thanks);
}

/** v2 logo wall cell. Rows without a logo image are dropped. */
export type ImpactLogo = Indexed & { image: string; name: string; url: string };

export function parseImpactLogos(raw: unknown): ImpactLogo[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      image: readString(row, "image"),
      name: readString(row, "name"),
      url: readString(row, "url"),
    }))
    .filter((r) => r.image !== "")
    .slice(0, WEALTH_IMPACT_MAX.logos);
}

// ─── Grouping (financials, people, portfolio) ────────────────────────────────

/**
 * Shared "group" column rule: rows are bucketed by their group in
 * first-seen order (case-insensitive; the first spelling wins). A blank
 * group joins the previous row's group; leading blank-group rows use
 * `fallbackGroup`. `keep` decides whether a row is collected (rows it
 * rejects still move the current group). Applies `max` to the RAW rows, the
 * same as the editor's max-rows cap.
 */
function groupRows<T>(
  raw: unknown,
  max: number,
  fallbackGroup: string,
  pick: (
    row: Record<string, unknown>,
    meta: { index: number; id: string },
  ) => T | null,
  onRow?: (groupKey: string, row: Record<string, unknown>) => void,
): { key: string; name: string; rows: T[] }[] {
  const groups = new Map<string, { key: string; name: string; rows: T[] }>();
  let current = fallbackGroup.trim();
  for (const { row, index, id } of rowsOf(raw).slice(0, max)) {
    const groupName = readString(row, "group");
    if (groupName) current = groupName;
    const key = current.toLowerCase();
    onRow?.(key, row);
    const picked = pick(row, { index, id });
    if (picked === null) continue;
    const entry = groups.get(key) ?? { key, name: current, rows: [] };
    entry.rows.push(picked);
    groups.set(key, entry);
  }
  return [...groups.values()];
}

// ─── People (NEW v2) ─────────────────────────────────────────────────────────

export type ImpactPerson = Indexed & {
  name: string;
  role: string;
  image: string;
  imageAlt: string;
};

export type ImpactPeopleGroup = {
  /** Group heading ("Meet our team"); "" when a leading row had no group and no fallback was given. */
  name: string;
  people: ImpactPerson[];
};

/**
 * Groups people by `group` (financials rule: first-seen order,
 * case-insensitive, blank joins the row above, leading blanks use
 * `fallbackGroup`). Rows need a name.
 */
export function parseImpactPeople(
  raw: unknown,
  fallbackGroup = "",
): ImpactPeopleGroup[] {
  return groupRows(raw, WEALTH_IMPACT_MAX.people, fallbackGroup, (row, m) => {
    const name = readString(row, "name");
    if (!name) return null;
    return {
      ...m,
      name,
      role: readString(row, "role"),
      image: readString(row, "image"),
      imageAlt: readString(row, "imageAlt"),
    };
  }).map(({ name, rows }) => ({ name, people: rows }));
}

/** "Keyanna Silverman-Maddox" → "KS"; "Teddy" → "T"; ignores punctuation. */
export function personInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const first = words[0];
  if (!first) return "";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const pick = (w: string) => Array.from(w)[0]?.toUpperCase() ?? "";
  return pick(first) + (last ? pick(last) : "");
}

// ─── Spotlights (NEW v2) ─────────────────────────────────────────────────────

export type ImpactFigure = { value: string; caption: string };

export type ImpactSpotlight = Indexed & {
  /** Menu label: the row's own label, else its heading. */
  navLabel: string;
  eyebrow: string;
  heading: string;
  body: string;
  statValue: string;
  statCaption: string;
  stat2Value: string;
  stat2Caption: string;
  /** Non-empty figures in order (0–2), for the numeral-tile column. */
  figures: ImpactFigure[];
  image: string;
  imageAlt: string;
  callout: string;
};

/** Rows render when they have a heading AND a body or a callout. */
export function parseImpactSpotlights(raw: unknown): ImpactSpotlight[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => {
      const heading = readString(row, "heading");
      const statValue = readString(row, "statValue");
      const statCaption = readString(row, "statCaption");
      const stat2Value = readString(row, "stat2Value");
      const stat2Caption = readString(row, "stat2Caption");
      const figures: ImpactFigure[] = [];
      if (statValue) figures.push({ value: statValue, caption: statCaption });
      if (stat2Value)
        figures.push({ value: stat2Value, caption: stat2Caption });
      return {
        id,
        index,
        navLabel: readString(row, "navLabel") || heading,
        eyebrow: readString(row, "eyebrow"),
        heading,
        body: readString(row, "body"),
        statValue,
        statCaption,
        stat2Value,
        stat2Caption,
        figures,
        image: readString(row, "image"),
        imageAlt: readString(row, "imageAlt"),
        callout: readString(row, "callout"),
      };
    })
    .filter((r) => r.heading !== "" && (r.body !== "" || r.callout !== ""))
    .slice(0, WEALTH_IMPACT_MAX.spotlights);
}

/** Anchor id of the Nth rendered spotlight (1-based). */
export function spotlightAnchorId(n: number): string {
  return `impact-spotlight-${n}`;
}

// ─── Lending portfolio (NEW v2) ──────────────────────────────────────────────

export type ImpactPortfolioRow = Indexed & {
  name: string;
  /** Industry column. */
  detail: string;
  date: string;
  /** Already link-scrubbed by `parseTemplateListRows`; route-check it too. */
  url: string;
};

export type ImpactPortfolioGroup = {
  /** First column header ("Current projects"). */
  name: string;
  /** Date column header: the group's first non-empty `dateLabel`, else the fallback. */
  dateLabel: string;
  rows: ImpactPortfolioRow[];
};

/**
 * Groups portfolio rows (financials rule). The per-group date heading is
 * the first non-empty `dateLabel` on ANY row of that group (a name-less
 * "header" row counts), else `fallbackDateLabel` (the
 * `portfolio-date-label` field). Rows need a name.
 */
export function parseImpactPortfolio(
  raw: unknown,
  fallbackGroup: string,
  fallbackDateLabel: string,
): ImpactPortfolioGroup[] {
  const labels = new Map<string, string>();
  const groups = groupRows(
    raw,
    WEALTH_IMPACT_MAX.portfolio,
    fallbackGroup,
    (row, m) => {
      const name = readString(row, "name");
      if (!name) return null;
      return {
        ...m,
        name,
        detail: readString(row, "detail"),
        date: readString(row, "date"),
        url: readString(row, "url"),
      };
    },
    (key, row) => {
      const label = readString(row, "dateLabel");
      if (label && !labels.has(key)) labels.set(key, label);
    },
  );
  return groups.map(({ key, name, rows }) => ({
    name,
    dateLabel: labels.get(key) ?? fallbackDateLabel.trim(),
    rows,
  }));
}

// ─── Ways to support (NEW v2) ────────────────────────────────────────────────

export type ImpactSupportWay = Indexed & { title: string; line: string };

export function parseImpactSupport(raw: unknown): ImpactSupportWay[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      title: readString(row, "title"),
      line: readString(row, "line"),
    }))
    .filter((r) => r.title !== "")
    .slice(0, WEALTH_IMPACT_MAX.support);
}

// ─── Sources (NEW v2) ────────────────────────────────────────────────────────

export type ImpactSource = Indexed & {
  /** 1-based number = position among RENDERED sources; `[n]` targets it. */
  n: number;
  text: string;
  url: string;
};

export function parseImpactSources(raw: unknown): ImpactSource[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      text: readString(row, "text"),
      url: readString(row, "url"),
    }))
    .filter((r) => r.text !== "")
    .slice(0, WEALTH_IMPACT_MAX.sources)
    .map((r, i) => ({ ...r, n: i + 1 }));
}

/** Anchor id of source N (1-based) — the `[N]` footnote target. */
export function sourceAnchorId(n: number): string {
  return `impact-source-${n}`;
}

// ─── Past reports ────────────────────────────────────────────────────────────

export type ImpactPastReport = Indexed & { label: string; url: string };

export function parseImpactPastReports(raw: unknown): ImpactPastReport[] {
  return rowsOf(raw)
    .map(({ row, index, id }) => ({
      id,
      index,
      label: readString(row, "label"),
      url: readString(row, "url"),
    }))
    .filter((r) => r.label !== "" && r.url !== "")
    .slice(0, WEALTH_IMPACT_MAX.past);
}

// ─── Financials ──────────────────────────────────────────────────────────────

export type ImpactFinancialRow = Indexed & {
  label: string;
  /** As the owner typed it ("$612,000"). */
  amount: string;
  /** Parsed amount, or null when blank / not a plain number. */
  amountValue: number | null;
  /** Percentage 0–100 (clamped), or null when blank / not a number. */
  share: number | null;
};

export type ImpactFinancialGroup = {
  name: string;
  rows: ImpactFinancialRow[];
  /** Formatted sum of amounts — only when EVERY row's amount parsed. */
  total: string | null;
  /** Sum of shares — only when every row has a share. */
  shareTotal: number | null;
  /** Largest share in the group (bars scale to it; 0 when none). */
  maxShare: number;
};

/** "54.6" / "54.6%" → 54.6, clamped to 0–100; null when not a number. */
export function parseShare(text: string): number | null {
  const cleaned = text.replace(/%/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

type ParsedAmount = { value: number; symbol: string; decimals: number };

/**
 * "$612,000" → 612000 · "($4,500)" / "-$4,500" → -4500 · "1,200.50" → 1200.5.
 * Anything with words or suffixes ("$1.4M", "Dec 31") is NOT a plain number.
 */
function parseAmountDetail(text: string): ParsedAmount | null {
  let s = text.trim();
  if (s === "") return null;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (/^[-−–]/.test(s)) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  const symbolMatch = /^[$€£]/.exec(s);
  const symbol = symbolMatch ? symbolMatch[0] : "";
  s = s.slice(symbol.length).trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const decimals = s.includes(".") ? (s.split(".")[1]?.length ?? 0) : 0;
  return { value: (negative ? -1 : 1) * Number(s), symbol, decimals };
}

export function parseAmount(text: string): number | null {
  return parseAmountDetail(text)?.value ?? null;
}

/** Shares render with at most one decimal ("54.6", "100"). */
export function formatShare(share: number): string {
  return String(Math.round(share * 10) / 10);
}

function formatTotal(parsed: ParsedAmount[]): string {
  const total = parsed.reduce((sum, p) => sum + p.value, 0);
  const symbol = parsed.find((p) => p.symbol)?.symbol ?? "";
  const decimals = Math.min(
    2,
    parsed.reduce((max, p) => Math.max(max, p.decimals), 0),
  );
  const body = Math.abs(total).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${total < 0 ? "-" : ""}${symbol}${body}`;
}

/**
 * Groups financial rows by their `group` value, preserving first-seen order
 * (case-insensitive match; the first spelling wins). A blank group joins the
 * previous row's group; leading blank-group rows use `fallbackGroup`. Rows
 * without a label are dropped.
 */
export function parseImpactFinancials(
  raw: unknown,
  fallbackGroup: string,
): ImpactFinancialGroup[] {
  const groups = new Map<
    string,
    { name: string; rows: ImpactFinancialRow[] }
  >();
  let current = fallbackGroup.trim();

  for (const { row, index, id } of rowsOf(raw).slice(
    0,
    WEALTH_IMPACT_MAX.financials,
  )) {
    const label = readString(row, "label");
    const groupName = readString(row, "group");
    if (groupName) current = groupName;
    if (!label) continue;
    const amount = readString(row, "amount");
    const key = current.toLowerCase();
    const entry = groups.get(key) ?? { name: current, rows: [] };
    entry.rows.push({
      id,
      index,
      label,
      amount,
      amountValue: parseAmount(amount),
      share: parseShare(readString(row, "share")),
    });
    groups.set(key, entry);
  }

  return [...groups.values()].map(({ name, rows }) => {
    const parsed = rows.map((r) => parseAmountDetail(r.amount));
    const allParsed = parsed.every((p): p is ParsedAmount => p !== null);
    const shares = rows.map((r) => r.share);
    const allShares = shares.every((s): s is number => s !== null);
    return {
      name,
      rows,
      total: allParsed ? formatTotal(parsed) : null,
      shareTotal: allShares
        ? Math.round(shares.reduce((a, b) => a + b, 0) * 10) / 10
        : null,
      maxShare: shares.reduce<number>((max, s) => Math.max(max, s ?? 0), 0),
    };
  });
}

// ─── CMS page body ───────────────────────────────────────────────────────────

/**
 * True when a Tiptap doc has any text, embed, image or other non-empty node.
 * Same rule as glove's `hasProseContent` (kept local so wealth never imports
 * from another template).
 */
export function hasImpactProse(content: unknown): boolean {
  const walk = (node: unknown): boolean => {
    if (node == null || typeof node !== "object") return false;
    const n = node as { type?: string; text?: string; content?: unknown };
    if (typeof n.text === "string" && n.text.trim().length > 0) return true;
    if (
      n.type &&
      [
        "image",
        "gallery",
        "embed",
        "video",
        "form",
        "quoteCalculator",
      ].includes(n.type)
    ) {
      return true;
    }
    return Array.isArray(n.content) && n.content.some(walk);
  };
  return walk(content);
}
