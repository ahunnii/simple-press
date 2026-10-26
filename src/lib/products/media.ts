/**
 * Product gallery media: photos and short videos share the `Image` table and
 * one `sortOrder` sequence. The first item is always a photo (enforced by
 * `productImagesListSchema` and the admin uploader), so `images[0]` stays a
 * photo for cards, cart, Stripe, emails and previews. Anything that reads past
 * `images[0]` should go through `photosOnly` / `primaryPhoto`.
 *
 * Client-safe: no server imports.
 */

export type ProductMediaType = "IMAGE" | "VIDEO";

export interface ProductMediaLike {
  url: string;
  mediaType?: ProductMediaType | null;
}

/** Max videos in one product's gallery (they count toward MAX_PRODUCT_IMAGES). */
export const MAX_PRODUCT_VIDEOS = 3;

/** Max size of one product video. Keep in sync with the `productVideos` upload route. */
export const MAX_PRODUCT_VIDEO_BYTES = 50 * 1024 * 1024;

/** Extensions the `productVideos` route accepts (lowercase, with dot). */
export const PRODUCT_VIDEO_EXTS = [".mp4", ".webm", ".mov"] as const;

/** MIME types the `productVideos` route accepts. */
export const PRODUCT_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** Prisma `where` for image includes that feed a thumbnail (cards, Stripe, search, ...). */
export const PHOTO_ONLY_WHERE = { mediaType: "IMAGE" } as const;

export function isVideoMedia(item: ProductMediaLike | null | undefined): boolean {
  return item?.mediaType === "VIDEO";
}

export function photosOnly<T extends ProductMediaLike>(items: readonly T[]): T[] {
  return items.filter((item) => !isVideoMedia(item));
}

export function videosOnly<T extends ProductMediaLike>(items: readonly T[]): T[] {
  return items.filter((item) => isVideoMedia(item));
}

/** First photo in gallery order, or undefined when the product has none. */
export function primaryPhoto<T extends ProductMediaLike>(
  items: readonly T[] | null | undefined,
): T | undefined {
  return items?.find((item) => !isVideoMedia(item));
}
