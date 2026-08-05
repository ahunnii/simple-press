import { publicUrlToKey } from "./url";

/**
 * Resolve a caller-supplied avatar URL to an S3 key, but only if that key
 * belongs to `userId`.
 *
 * Returns `null` for anything else — a different user's avatar, a non-avatar
 * object, a URL outside our bucket, or a malformed one.
 *
 * This is the authorization boundary for `account.deleteAvatar`. The URL comes
 * from the client, so without this check that mutation would delete any object
 * in the bucket on behalf of any signed-in user.
 *
 * Avatar keys are fixed per user and flat: `avatars/{userId}.{ext}` — see the
 * `avatar` route in `src/app/api/upload/route.ts`.
 */
export function resolveOwnAvatarKey(
  url: string,
  userId: string,
): string | null {
  if (!url || !userId) return null;

  // Uploads append a `?v=` cache-buster; strip that (and any fragment) before
  // the URL is reduced to a key.
  const withoutQuery = url.split(/[?#]/)[0] ?? "";
  const key = publicUrlToKey(withoutQuery);
  if (!key) return null;

  const prefix = `avatars/${userId}.`;
  if (!key.startsWith(prefix)) return null;

  // Everything after the prefix must be a bare extension. Guards against a
  // crafted id turning into a path (`avatars/{id}./../../secret`).
  const rest = key.slice(prefix.length);
  if (rest.length === 0 || rest.includes("/") || rest.includes(".")) return null;

  return key;
}
