/**
 * Publish rules — gate whether a newly synced YouTube video is auto-published
 * or lands as a hidden draft.
 *
 * Rules are stored as JSON on `VideoSource.publishRules`, validated elsewhere
 * by zod (`src/lib/validators/videos.ts`). This module is the ONE place the
 * rule SEMANTICS live, because it has three consumers that must never
 * disagree:
 *
 * - the sync engine — decides publish state at insert time,
 * - the `videos.reapplyRules` tRPC procedure — re-evaluates existing videos
 *   against a rule set the owner just edited, and
 * - the admin client — renders a one-line summary/preview of what a rule set
 *   does before the owner saves it.
 *
 * Rules are evaluated against YouTube's own `title` (sync-owned) — NEVER the
 * owner's `titleOverride` — because the rule is meant to describe what the
 * creator actually uploads, not what this app later displays it as.
 *
 * Deliberately dependency-free (no zod, no React, no Prisma types) so the
 * admin client bundle pays nothing to import it.
 *
 * Adding a future rule kind (e.g. minimum duration — not possible today
 * because the Atom feed has no length) is one row in `RULE_CHECKS` below plus
 * one field in the zod schema.
 */

import type { DayCode } from "~/lib/business-hours";

export const PUBLISH_RULES_VERSION = 1 as const;
export const MAX_RULE_PHRASES = 20;
export const MAX_RULE_PHRASE_LENGTH = 100;

export type PublishRules = {
  version: typeof PUBLISH_RULES_VERSION;
  /** Title must contain at least one (case-insensitive substring). Empty = no constraint. */
  titleInclude: string[];
  /** Title must contain none of these. Empty = no constraint. */
  titleExclude: string[];
  /** publishedAt must fall on one of these weekdays in the business's time zone. Empty = no constraint. */
  weekdays: DayCode[];
};

export type PublishRuleSubject = { title: string; publishedAt: Date };
export type PublishRuleContext = { timeZone: string };
export type PublishRuleReason = "title-include" | "title-exclude" | "weekday";
export type PublishRuleVerdict = {
  publish: boolean;
  failed: PublishRuleReason[];
};

export function emptyPublishRules(): PublishRules {
  return {
    version: PUBLISH_RULES_VERSION,
    titleInclude: [],
    titleExclude: [],
    weekdays: [],
  };
}

/** True when at least one clause is non-empty. Type guard narrowing out null/undefined. */
export function hasAnyRule(
  rules: PublishRules | null | undefined,
): rules is PublishRules {
  if (!rules) return false;
  return (
    rules.titleInclude.length > 0 ||
    rules.titleExclude.length > 0 ||
    rules.weekdays.length > 0
  );
}

/**
 * "Bamboo Hour, trailer,, Trailer " → ["Bamboo Hour", "trailer"]: split on
 * commas, trim, drop empties, dedupe case-insensitively keeping the first
 * occurrence's casing.
 */
export function parsePhraseList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const piece of raw.split(",")) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

// ─── zoned weekday ───────────────────────────────────────────────────────────

const WEEKDAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const SHORT_WEEKDAY_TO_DAY_CODE: Record<string, DayCode> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

function weekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = WEEKDAY_FORMATTERS.get(timeZone);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    });
  } catch {
    // Invalid IANA zone (e.g. a typo in a tenant's `Business.timeZone`) — fall
    // back to UTC and cache the fallback under the bad key so this never
    // throws again for the same input, and never re-attempts construction.
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
    });
  }

  WEEKDAY_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

/**
 * Weekday `date` falls on in `timeZone`. Uses Intl en-US `weekday: "short"`
 * with a per-zone formatter cache; an invalid zone falls back to UTC and
 * never throws.
 */
export function zonedDayCode(date: Date, timeZone: string): DayCode {
  const short = weekdayFormatter(timeZone).format(date);
  const code = SHORT_WEEKDAY_TO_DAY_CODE[short];
  // `short` is always one of the seven keys above for a real Intl formatter,
  // but fall back to Sunday rather than `undefined` if some exotic ICU
  // build ever hands back something else — never throw from a display path.
  return code ?? "sun";
}

// ─── rule checks ─────────────────────────────────────────────────────────────

/**
 * THE seam for new rule kinds: add a row here (in the order it should be
 * checked and reported) plus one field on `PublishRules`. Order matters — it
 * is the order reasons appear in a verdict's `failed` array.
 */
const RULE_CHECKS: readonly {
  reason: PublishRuleReason;
  applies(rules: PublishRules): boolean;
  passes(
    rules: PublishRules,
    subject: PublishRuleSubject,
    ctx: PublishRuleContext,
  ): boolean;
}[] = [
  {
    reason: "title-include",
    applies: (rules) => rules.titleInclude.length > 0,
    passes: (rules, subject) => {
      const title = subject.title.toLowerCase();
      return rules.titleInclude.some((phrase) =>
        title.includes(phrase.toLowerCase()),
      );
    },
  },
  {
    reason: "title-exclude",
    applies: (rules) => rules.titleExclude.length > 0,
    passes: (rules, subject) => {
      const title = subject.title.toLowerCase();
      return !rules.titleExclude.some((phrase) =>
        title.includes(phrase.toLowerCase()),
      );
    },
  },
  {
    reason: "weekday",
    applies: (rules) => rules.weekdays.length > 0,
    passes: (rules, subject, ctx) => {
      const day = zonedDayCode(subject.publishedAt, ctx.timeZone);
      return rules.weekdays.includes(day);
    },
  },
];

/**
 * All applicable clauses AND together. null/undefined/no clauses →
 * `{ publish: true, failed: [] }`. `failed` lists reasons in `RULE_CHECKS`
 * table order.
 */
export function evaluatePublishRules(
  rules: PublishRules | null | undefined,
  subject: PublishRuleSubject,
  ctx: PublishRuleContext,
): PublishRuleVerdict {
  if (!hasAnyRule(rules)) return { publish: true, failed: [] };

  const failed: PublishRuleReason[] = [];
  for (const check of RULE_CHECKS) {
    if (!check.applies(rules)) continue;
    if (!check.passes(rules, subject, ctx)) failed.push(check.reason);
  }

  return { publish: failed.length === 0, failed };
}

/** Short labels keyed by DayCode: mon→"Mon" … sun→"Sun". */
export const DAY_CODE_LABELS: Record<DayCode, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const WEEKDAY_ORDER: readonly DayCode[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

function quoted(phrases: string[]): string {
  return phrases.map((phrase) => `"${phrase}"`).join(" or ");
}

/**
 * One-line owner-facing summary, or null when there are no rules. Parts
 * joined with " · ".
 *
 * Include part: `title contains "A" or "B"`; exclude part: `not "C" or "D"`;
 * weekday part: labels in Mon..Sun order regardless of stored order, e.g.
 * `Tue, Thu`.
 *
 * Full example: `title contains "Bamboo Hour" · not "Trailer" · Tue, Thu`
 */
export function describePublishRules(
  rules: PublishRules | null | undefined,
): string | null {
  if (!hasAnyRule(rules)) return null;

  const parts: string[] = [];

  if (rules.titleInclude.length > 0) {
    parts.push(`title contains ${quoted(rules.titleInclude)}`);
  }

  if (rules.titleExclude.length > 0) {
    parts.push(`not ${quoted(rules.titleExclude)}`);
  }

  if (rules.weekdays.length > 0) {
    const ordered = WEEKDAY_ORDER.filter((day) => rules.weekdays.includes(day));
    parts.push(ordered.map((day) => DAY_CODE_LABELS[day]).join(", "));
  }

  return parts.join(" · ");
}
