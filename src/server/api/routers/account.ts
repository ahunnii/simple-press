import { z } from "zod";

import { resolveOwnAvatarKey } from "~/lib/s3/avatar-key";
import { deleteStoredObjects } from "~/lib/s3/delete";
import { keyToPublicUrl } from "~/lib/s3/url";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Signed-in user's own account operations.
 *
 * Deliberately not tenant-scoped: better-auth users are global (one account
 * works across every storefront), so everything here keys off the session user
 * rather than a resolved business.
 */
export const accountRouter = createTRPCRouter({
  /**
   * Delete the caller's avatar object from storage.
   *
   * Called from `<AuthProvider avatar={{ delete }}>` after the user clears
   * their picture. Storage credentials are server-only, so this cannot happen
   * client-side.
   *
   * The URL is caller-supplied, so it is never trusted: it is reduced back to
   * an S3 key and that key must be *exactly* the caller's own avatar key.
   * Without that check this would be an arbitrary-object-delete endpoint for
   * any signed-in user.
   */
  deleteAvatar: protectedProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = resolveOwnAvatarKey(input.url, ctx.session.user.id);
      if (!key) return { deleted: false };

      // Best-effort by design: reports to Sentry, never throws. A failed
      // storage delete must not block the user from clearing their avatar.
      await deleteStoredObjects([keyToPublicUrl(key)]);

      return { deleted: true };
    }),
});
