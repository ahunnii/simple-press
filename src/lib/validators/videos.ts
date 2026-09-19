import { z } from "zod";

import type { PublishRules } from "~/lib/youtube/publish-rules";
import { DAY_CODES } from "~/lib/business-hours";
import { parseSourceInput, parseYouTubeVideoId } from "~/lib/youtube/parse";
import {
  hasAnyRule,
  MAX_RULE_PHRASE_LENGTH,
  MAX_RULE_PHRASES,
  PUBLISH_RULES_VERSION,
} from "~/lib/youtube/publish-rules";

// ─── Video ────────────────────────────────────────────────────────────────

export const videoCreateSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "A YouTube URL is required")
    .refine((value) => parseYouTubeVideoId(value) !== null, {
      message: "Enter a valid YouTube video URL",
    }),
});

export type VideoCreateData = z.infer<typeof videoCreateSchema>;

// Owner-editable fields only. `title`, `description`, `thumbnailUrl`,
// `channelTitle`, and `publishedAt` are sync-owned — written by the YouTube
// sync job (src/lib/youtube/sync.ts) from the YouTube Data API response on
// every poll. Exposing them here would let an owner's edit appear to "stick"
// only to be silently clobbered by the next sync run; the *Override fields
// exist precisely so owner edits survive re-syncs without touching the
// sync-owned columns.
/**
 * Normalizes an optional owner-override field to Prisma's update semantics.
 *
 *   undefined  → undefined  ("key omitted — leave the column alone")
 *   null / ""  → null       ("owner cleared it — fall back to the synced value")
 *   a value    → that value
 *
 * The `undefined` arm is load-bearing. `videos.update` spreads its parsed input
 * straight into Prisma's `data`, where `undefined` means "no change" but `null`
 * means "write NULL". Any transform that maps an OMITTED key to null turns every
 * partial update into a destructive one — flip `published`, lose the custom
 * thumbnail. That is the same class of bug as the sync-clobber invariant in
 * `src/lib/youtube/sync.ts`, just on the owner-edit path, and it is equally
 * invisible: no error, no failed request, just quietly erased work.
 *
 * Covered by regression tests in `videos.test.ts`. Do not "simplify" this to
 * `(v) => v || null`.
 */
function emptyToNull(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
}

export const videoUpdateSchema = z.object({
  id: z.string(),
  // `""` collapses to null here rather than being stored verbatim. The
  // storefront resolves copy as `titleOverride ?? title`, and `??` does NOT
  // fall through on an empty string — so a stored `""` would render a video
  // with a blank title instead of falling back to YouTube's. Clearing the
  // field in the admin form is the same gesture as "use YouTube's title", and
  // both must land on null. Doing it here rather than in the form means any
  // other caller gets the same guarantee.
  //
  // `undefined` is preserved — omitted means "leave unchanged", which is a
  // different thing from "clear it". See `emptyToNull` above.
  titleOverride: z
    .string()
    .max(200, "Title must be 200 characters or fewer")
    .nullish()
    .transform(emptyToNull),
  descriptionOverride: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .nullish()
    .transform(emptyToNull),
  // `""` is accepted on the wire (rather than rejected as an invalid URL)
  // because that is how the owner clears the field in the admin form; it then
  // normalizes to null via the same rule as the two fields above.
  thumbnailOverride: z
    .union([z.string().trim().url("Enter a valid URL"), z.literal("")])
    .nullish()
    .transform(emptyToNull),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type VideoUpdateData = z.infer<typeof videoUpdateSchema>;

/**
 * Resolves the title a video should render with. This is the single
 * derivation shared by the admin list page's search predicate and the
 * client's row render — the platform rule is "search what the row renders",
 * and if the two derive the resolved title independently they can drift
 * (e.g. the search box matching against YouTube's title while the row shows
 * the owner's override, or vice versa).
 *
 * `??` is safe here rather than `||`: `videoUpdateSchema` collapses `""` to
 * `null` (the `emptyToNull` invariant documented above), so `titleOverride`
 * is either meaningful text or `null` — never `""` — and there is no empty
 * string that could accidentally win over `title`.
 */
export function resolveVideoTitle(v: {
  title: string;
  titleOverride: string | null;
}): string {
  return v.titleOverride ?? v.title;
}

/**
 * Resolves the thumbnail URL a video should render with. Same rationale as
 * `resolveVideoTitle`: one shared derivation for the admin list's search
 * predicate and its row render, so they can't drift by deriving the
 * resolved value independently.
 *
 * `??` is safe here too: `videoUpdateSchema` collapses `""` to `null` for
 * `thumbnailOverride` (the `emptyToNull` invariant above), so the override
 * column is either a valid URL or `null`, never `""`.
 */
export function resolveVideoThumbnail(v: {
  thumbnailUrl: string | null;
  thumbnailOverride: string | null;
}): string | null {
  return v.thumbnailOverride ?? v.thumbnailUrl;
}

/**
 * The text a video's source badge renders — "Added manually" for hand-added
 * videos, otherwise the source's owner-set label falling back to its kind.
 * Returns `null` when the video claims a source that wasn't found (the badge
 * renders nothing in that state, so search must match nothing for it too).
 *
 * Same single-derivation rationale as `resolveVideoTitle`: the admin list
 * searches this field BECAUSE the row renders it ("search what the row
 * renders") — an owner sees the "Tutorials" badge and types "Tutorials", so
 * the search predicate and the badge must be the same string or the search
 * becomes a dead end.
 */
export function videoSourceBadgeText(
  video: { sourceId: string | null },
  source: { label: string | null; kind: string } | undefined,
): string | null {
  if (video.sourceId === null) return "Added manually";
  if (!source) return null;
  return source.label ?? (source.kind === "playlist" ? "Playlist" : "Channel");
}

/**
 * Badge text the admin list renders on a draft video with `hiddenByRule`
 * set. Exported as a constant, per this file's "search what the row
 * renders" rule (see `videoSourceBadgeText` above), so the list's search
 * predicate matches this exact string rather than hardcoding it a second
 * time and risking drift.
 */
export const HIDDEN_BY_RULE_BADGE = "Hidden by rule";

// ─── Reorder ──────────────────────────────────────────────────────────────

export const videoReorderSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one video id is required")
    .max(500, "Too many videos selected"),
});

export type VideoReorderData = z.infer<typeof videoReorderSchema>;

// ─── Publish rules ────────────────────────────────────────────────────────

/**
 * "Bamboo Hour", "bamboo hour", "Bamboo Hour" → keep only the first —
 * case-insensitive dedupe that preserves the first occurrence's casing. Kept
 * as its own small function (rather than reusing `parsePhraseList` from
 * `publish-rules.ts`) because that helper also splits on commas, and a
 * phrase here has already arrived as one array element from the admin form
 * — splitting it again would break a phrase that legitimately contains one.
 */
function dedupePhrasesCaseInsensitive(phrases: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const phrase of phrases) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(phrase);
  }

  return result;
}

const phraseList = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Phrases can't be blank")
      .max(
        MAX_RULE_PHRASE_LENGTH,
        `Phrases must be ${MAX_RULE_PHRASE_LENGTH} characters or fewer`,
      ),
  )
  .max(MAX_RULE_PHRASES, `At most ${MAX_RULE_PHRASES} phrases`)
  .default([])
  .transform(dedupePhrasesCaseInsensitive);

/**
 * Validates the shape of `VideoSource.publishRules` (`Json?`). This schema is
 * the ONLY writer of that column. The SEMANTICS of these fields — how they
 * gate a synced video's publish state, how they're summarized for the owner
 * — live entirely in `src/lib/youtube/publish-rules.ts`, not here; this file
 * only owns validation and normalization on the way into storage.
 */
export const publishRulesSchema = z.object({
  version: z.literal(PUBLISH_RULES_VERSION),
  titleInclude: phraseList,
  titleExclude: phraseList,
  weekdays: z
    .array(z.enum(DAY_CODES))
    .default([])
    .transform((days) => [...new Set(days)]),
}) satisfies z.ZodType<PublishRules, z.ZodTypeDef, unknown>;

export type PublishRulesInput = z.input<typeof publishRulesSchema>;

/**
 * Three states for reading `VideoSource.publishRules` back out of storage,
 * deliberately NOT collapsed into a boolean or a bare nullable `PublishRules`:
 *
 * - `"none"` — nothing configured: either the column is `NULL`, or it holds a
 *   rule set every clause of which is empty (`hasAnyRule` false). A rule set
 *   the owner saved and then fully cleared must behave identically to a
 *   column that was never touched.
 * - `"rules"` — a valid, non-empty rule set ready to evaluate.
 * - `"invalid"` — the stored JSON failed `publishRulesSchema` (a version
 *   bump, hand-edited data, whatever). Callers MUST fail CLOSED on this: the
 *   sync engine inserts the video as a hidden draft rather than guessing at
 *   intent, and the `reapplyRules` router procedure refuses to re-apply a
 *   rule set it can't read rather than silently treating "unreadable" the
 *   same as "no rules" (which would auto-publish everything).
 */
export type StoredPublishRules =
  | { kind: "none" }
  | { kind: "rules"; rules: PublishRules }
  | { kind: "invalid" };

export function parseStoredPublishRules(raw: unknown): StoredPublishRules {
  if (raw === null || raw === undefined) return { kind: "none" };

  const parsed = publishRulesSchema.safeParse(raw);
  if (!parsed.success) return { kind: "invalid" };
  if (!hasAnyRule(parsed.data)) return { kind: "none" };
  return { kind: "rules", rules: parsed.data };
}

// ─── Video source (channel / playlist) ───────────────────────────────────

export const videoSourceCreateSchema = z.object({
  input: z
    .string()
    .trim()
    .min(1, "A channel or playlist URL is required")
    .refine((value) => parseSourceInput(value) !== null, {
      message: "Enter a valid YouTube channel or playlist URL",
    }),
  label: z
    .string()
    .max(120, "Label must be 120 characters or fewer")
    .optional(),
  autoPublish: z.boolean().default(true),
  publishRules: publishRulesSchema.nullable().optional(),
});

export type VideoSourceCreateData = z.infer<typeof videoSourceCreateSchema>;

export const videoSourceUpdateSchema = z.object({
  id: z.string(),
  label: z
    .string()
    .max(120, "Label must be 120 characters or fewer")
    .optional(),
  enabled: z.boolean().optional(),
  autoPublish: z.boolean().optional(),
  // Same doctrine as `emptyToNull` above: `undefined` = key omitted, leave
  // the column alone; `null` = owner cleared the rules, write NULL;
  // an object = replace wholesale. The router maps `null` AND an all-empty
  // parsed object (see `hasAnyRule`) to `Prisma.DbNull`.
  publishRules: publishRulesSchema.nullable().optional(),
});

export type VideoSourceUpdateData = z.infer<typeof videoSourceUpdateSchema>;
