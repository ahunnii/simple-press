"use client";

import { uploadFile } from "@better-upload/client";

import { getStoredPath } from "~/lib/uploads";
import { trpcVanilla } from "~/trpc/vanilla";

/**
 * Upload a user avatar and return the URL to store on `user.image`.
 *
 * Wired into `<AuthProvider avatar={{ upload }}>` in `src/providers/providers.tsx`.
 * Better Auth UI resizes the image first (256px, webp) and hands us the result,
 * so this only has to move bytes.
 *
 * **This must exist.** With no `upload` hook the library falls back to encoding
 * the image as a base64 data URL and writing that straight into `user.image` —
 * tens of kilobytes that would then be serialized into the 7-day
 * `session.cookieCache` configured in `src/server/better-auth/config.tsx`,
 * blowing past the ~4KB browser cookie limit.
 *
 * The imperative `uploadFile` is used rather than the `useUploadFile` hook the
 * rest of the app uses, because this runs as a plain callback from provider
 * config, outside any React render.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const result = await uploadFile({ route: "avatar", file });

  const url = getStoredPath(result.file);
  if (!url) {
    // Throwing here is deliberate and load-bearing. `change-avatar.tsx` does:
    //
    //   (await avatar.upload?.(resized)) || (await fileToAvatarDataUrl(resized))
    //
    // so returning an empty string would silently fall through to the base64
    // data-URL path this whole module exists to avoid. A throw is caught by
    // that component and surfaced as an error toast instead.
    throw new Error("Avatar upload succeeded but returned no URL");
  }

  // The S3 key is fixed per user (`avatars/{userId}.webp`) so that re-uploading
  // overwrites in place instead of orphaning the old object. That means the URL
  // alone never changes, and a browser or CDN would happily keep serving the
  // previous image — hence the version parameter.
  return `${url}?v=${Date.now()}`;
}

/**
 * Remove the caller's stored avatar object after they clear their picture.
 *
 * Wired into `<AuthProvider avatar={{ delete }}>`. Storage credentials are
 * server-only, so the actual delete happens in `account.deleteAvatar`, which
 * also verifies the key belongs to the calling user.
 *
 * Best-effort: better-auth has already set `user.image` to null by the time
 * this runs, so failing here would leave an orphaned object but must not
 * surface as an error to someone who successfully removed their avatar.
 */
export async function deleteAvatar(url: string): Promise<void> {
  try {
    await trpcVanilla.account.deleteAvatar.mutate({ url });
  } catch {
    // Intentionally swallowed — see above.
  }
}
