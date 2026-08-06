import type { RouterOutputs } from "~/trpc/react";
import { AuthRedirect } from "~/components/auth/auth-redirect";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { FieldDescription } from "~/components/ui/field";

import { DefaultAuthShell } from "./default-auth-shell";

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

/**
 * `AuthRedirect` only renders a bare spinner — no card of its own — so this
 * page wraps it in a `Card` to match the visual weight of the other auth
 * pages. Used at both store subdomains (business != null) and the platform
 * root (business == null).
 */
export function DefaultAuthRedirectPage({ business }: Props) {
  return (
    <DefaultAuthShell
      business={business}
      headline="Taking you back…"
      subhead="You're already signed in."
      badgeView={null}
      legalFooter="generic"
    >
      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Taking you back
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <AuthRedirect />
            <FieldDescription>You&apos;re already signed in.</FieldDescription>
          </div>
        </CardContent>
      </Card>
    </DefaultAuthShell>
  );
}
