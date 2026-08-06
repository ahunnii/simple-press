import type { RouterOutputs } from "~/trpc/react";
import { SignIn } from "~/components/auth/sign-in";

import { DefaultAuthShell } from "./default-auth-shell";

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

/**
 * Used at both store subdomains (business != null)
 * and the platform root (business == null, e.g. platform admins).
 */
export function DefaultSignInPage({ business }: Props) {
  const isPlatformRoot = !business;

  return (
    <DefaultAuthShell
      business={business}
      headline={
        isPlatformRoot ? "Welcome back" : `Welcome back to ${business.name}`
      }
      subhead={
        isPlatformRoot
          ? "Sign in to your SimplePress account to manage your stores."
          : "Sign in to track your orders and manage your account."
      }
      // Platform context callout — only shown on store pages
      callout={
        isPlatformRoot ? undefined : (
          <>
            <span className="font-semibold">Using a SimplePress account.</span>{" "}
            Your login works across all stores on the SimplePress platform — one
            account, everywhere.
          </>
        )
      }
      badgeView="sign-in"
      legalFooter="sign-in"
    >
      <SignIn className="max-w-full" />
    </DefaultAuthShell>
  );
}
