import { z } from "zod";

import { parseSourceInput, parseYouTubeVideoId } from "~/lib/youtube/parse";

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
function emptyToNull(value: string | null | undefined): string | null | undefined {
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

// ─── Reorder ──────────────────────────────────────────────────────────────

export const videoReorderSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one video id is required")
    .max(500, "Too many videos selected"),
});

export type VideoReorderData = z.infer<typeof videoReorderSchema>;

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
});

export type VideoSourceUpdateData = z.infer<typeof videoSourceUpdateSchema>;
