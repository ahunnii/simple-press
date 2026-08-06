import type { RouterOutputs } from "~/trpc/react";
import { VerifyEmail } from "~/components/auth/verify-email";

import { DefaultAuthShell } from "./default-auth-shell";

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

/**
 * Used at both store subdomains (business != null) and the platform root
 * (business == null).
 */
export function DefaultVerifyEmailPage({ business }: Props) {
  return (
    <DefaultAuthShell
      business={business}
      headline="Verify your email"
      subhead="Confirm your address to finish setting up your account."
      badgeView={null}
      legalFooter="generic"
    >
      <VerifyEmail className="max-w-full" />
    </DefaultAuthShell>
  );
}
