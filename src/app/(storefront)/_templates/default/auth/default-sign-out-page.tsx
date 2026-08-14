import type { RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { FieldDescription } from "~/components/ui/field";
import { SignOut } from "~/components/auth/sign-out";

import { DefaultAuthShell } from "./default-auth-shell";

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

/**
 * `SignOut` only renders a bare spinner — no card of its own — so this page
 * wraps it in a `Card` to match the visual weight of the other auth pages.
 * Used at both store subdomains (business != null) and the platform root
 * (business == null).
 */
export function DefaultSignOutPage({ business }: Props) {
  return (
    <DefaultAuthShell
      business={business}
      headline="Signing you out…"
      subhead="One moment while we end your session."
      badgeView={null}
      legalFooter="generic"
    >
      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Signing you out
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <SignOut />
            <FieldDescription>
              One moment while we end your session.
            </FieldDescription>
          </div>
        </CardContent>
      </Card>
    </DefaultAuthShell>
  );
}
