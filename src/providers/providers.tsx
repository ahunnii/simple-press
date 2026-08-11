"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { captchaPlugin } from "@better-auth-ui/react/plugins";
import { QueryClient } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";

import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { deleteAvatar, uploadAvatar } from "~/lib/avatar-upload";
import { authClient } from "~/server/better-auth/client";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AuthProvider } from "~/components/auth/auth-provider";
import { RecaptchaWidget } from "~/components/auth/captcha/recaptcha-widget";
import { CartProvider } from "~/providers/cart-context";
import { WishlistProvider } from "~/providers/wishlist-context";

/**
 * No `additionalFields` are passed to `<AuthProvider>` on purpose.
 *
 * This used to declare a `terms` consent checkbox here. It was removed because
 * it duplicated the `termsAccepted` checkbox that `src/components/auth/sign-up.tsx`
 * renders directly — same sentence, same screen, stacked one above the other.
 *
 * The one in `sign-up.tsx` is the real one, and the only one worth keeping:
 *   - it persists. `databaseHooks.user.create.before` stamps
 *     `User.termsAcceptedAt` / `termsVersion` via `resolvePlatformTermsAcceptance`
 *     (`src/server/better-auth/terms-acceptance.ts`). The `terms` field here wrote
 *     nothing at all — there is no `terms` column and no matching
 *     `user.additionalFields.terms` in the better-auth config, so
 *     `parseInputData` silently dropped the key.
 *   - its policy links are absolute (built from the platform origin), so they
 *     resolve to the platform host from a tenant subdomain. The links here were
 *     relative and pointed at the tenant.
 *   - it renders a real `FieldError` on invalid submit.
 *
 * If you need a genuinely new sign-up field, add it back here — but declare a
 * matching column and `user.additionalFields` entry in the better-auth config,
 * or it will be dropped the same silent way.
 */

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  // `Providers` renders *outside* `TRPCReactProvider` (see `src/app/layout.tsx`),
  // so there is no ambient QueryClient to inherit. Giving the auth UI its own
  // client is also what keeps `SessionSync`'s `queryClient.clear()` — which
  // targets the tRPC cache — from wiping the auth session query mid-flight.
  const [authQueryClient] = useState(() => new QueryClient());

  return (
    // <ThemeProvider
    //   attribute="class"
    //   defaultTheme="system"
    //   enableSystem
    //   disableTransitionOnChange
    // >

    <>
      <Toaster closeButton />
      <CartProvider>
        <WishlistProvider>
          {/*
           * Session refresh lives in `<SessionSync />` (`src/trpc/react.tsx`),
           * which is the single owner of that behaviour. Do NOT add an
           * equivalent here: running two `router.refresh()` calls on the same
           * session transition races the sign-in navigation and bounces the
           * user straight back to /auth/sign-in — caught by
           * e2e/auth.default.spec.ts.
           */}
          <AuthProvider
            authClient={authClient}
            queryClient={authQueryClient}
            navigate={({ to, replace }) =>
              replace ? router.replace(to) : router.push(to)
            }
            Link={Link}
            basePaths={{ ...AUTH_BASE_PATHS }}
            viewPaths={{
              auth: { ...AUTH_VIEW_PATHS },
              settings: { ...SETTINGS_VIEW_PATHS },
            }}
            redirectTo="/"
            emailAndPassword={{
              enabled: true,
              forgotPassword: true,
              name: true,
              requireEmailVerification: true,
            }}
            // Stages a reCAPTCHA v3 token on sign-in, sign-up, and
            // forgot-password and attaches `x-captcha-response` — matching the
            // endpoints our server-side `recaptcha()` plugin protects
            // (`~/server/better-auth/plugins/recaptcha`). Without this, every
            // credentialed auth request 400s.
            //
            // v3 renders no widget, so the token is minted on mount and
            // refreshed on a timer rather than collected from a user
            // interaction — `captchaPlugin` exposes no pre-submit hook, so a
            // live token has to be staged ahead of submit. See
            // `recaptcha-widget.tsx` for that lifecycle.
            plugins={[captchaPlugin({ render: RecaptchaWidget })]}
            // `upload` is not optional in practice: without it the library
            // encodes the image as a base64 data URL and writes that into
            // `user.image`, which then rides in the 7-day
            // `session.cookieCache` configured in
            // `src/server/better-auth/config.tsx` and blows past the ~4KB
            // browser cookie limit. `uploadAvatar` stores it in MinIO/S3 and
            // returns a URL instead.
            //
            // NOTE: `enabled` is not honoured by this version of the library
            // — neither the vendored components nor `@better-auth-ui/react`
            // ever read it, so the "Change avatar" control renders either
            // way. Providing `upload` is the only thing that actually keeps
            // an image out of `user.image` as base64.
            avatar={{
              enabled: true,
              size: 256,
              extension: "webp",
              upload: uploadAvatar,
              delete: deleteAvatar,
            }}
          >
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </WishlistProvider>
      </CartProvider>
    </>
    // </ThemeProvider>
  );
}
