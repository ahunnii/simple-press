import type { RouterOutputs } from "~/trpc/react";
import { ResetLinkSent } from "~/components/auth/reset-link-sent";

import { DefaultAuthShell } from "./default-auth-shell";

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

/**
 * Used at both store subdomains (business != null) and the platform root
 * (business == null).
 */
export function DefaultResetLinkSentPage({ business }: Props) {
  return (
    <DefaultAuthShell
      business={business}
      headline="Check your email"
      subhead="We've sent you a link to reset your password."
      badgeView={null}
      legalFooter="generic"
    >
      <ResetLinkSent className="max-w-full" />
    </DefaultAuthShell>
  );
}
