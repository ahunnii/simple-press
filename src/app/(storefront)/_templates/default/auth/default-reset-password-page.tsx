import type { RouterOutputs } from "~/trpc/react";
import { ResetPassword } from "~/components/auth/reset-password";

import { DefaultAuthShell } from "./default-auth-shell";

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

export function DefaultResetPasswordPage({ business }: Props) {
  const isPlatformRoot = !business;

  return (
    <DefaultAuthShell
      business={business}
      headline="Reset your password"
      subhead={
        isPlatformRoot
          ? "Enter your new password."
          : `Enter your new password for ${business.name}.`
      }
      // Platform context callout — only shown on store pages
      callout={
        isPlatformRoot ? undefined : (
          <>
            <span className="font-semibold">Using a SimplePress account.</span>{" "}
            Your login works across all stores on the SimplePress platform — one
            account, everywhere. Resetting your password will sign you out of
            all other stores.
          </>
        )
      }
      badgeView="sign-in"
      legalFooter="generic"
    >
      <ResetPassword className="max-w-full" />
    </DefaultAuthShell>
  );
}
