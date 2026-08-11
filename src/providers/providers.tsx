"use client";

import type { AdditionalFields } from "@better-auth-ui/core";
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
 * Terms-of-service consent gate shown on sign-up.
 *
 * `profile: false` matters — the field defaults to also rendering on the user
 * profile, but this is a one-time consent checkbox, not an editable attribute.
 *
 * There is deliberately no `terms` column on `User` and no matching
 * `user.additionalFields.terms` in `src/server/better-auth/config.tsx`; this is
 * a client-side gate only. better-auth's `parseInputData` iterates the declared
 * schema, so the undeclared `terms` key is silently dropped rather than 400ing.
 */
const ADDITIONAL_FIELDS: AdditionalFields = [
  {
    name: "terms",
    type: "boolean",
    // A `boolean` field renders as a toggle SWITCH by default. That's wrong for
    // a consent gate — agreeing to terms is a checkbox. Caught by
    // e2e/auth.default.spec.ts's sign-up test.
    inputType: "checkbox",
    required: true,
    // Rendered on sign-up, below the password block.
    signUp: true,
    profile: false,
    // The label is a ReactNode in this package, so the policies are reachable
    // from the form itself. `stopPropagation` keeps a link click from toggling
    // the checkbox the label is bound to.
    //
    // Wrapped in a single `<span>` element: `FieldLabel` is `flex w-fit gap-2`,
    // so a fragment's children become separate flex items that wrap into
    // individual columns. A single span makes the label one flex child, allowing
    // the text to flow normally across lines.
    label: (
      <span className="text-sm leading-snug font-normal">
        I agree to SimplePress&apos;s{" "}
        <Link
          href="/platform/policies/terms-of-service"
          target="_blank"
          className="underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/platform/policies/privacy-policy"
          target="_blank"
          className="underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </Link>
      </span>
    ),
  },
];

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
            additionalFields={ADDITIONAL_FIELDS}
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
