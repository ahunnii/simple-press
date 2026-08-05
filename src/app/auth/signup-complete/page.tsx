import { api } from "~/trpc/server";
import { DefaultAuthShell } from "~/app/(storefront)/_templates/default/auth/default-auth-shell";

import { SignupCompleteClient } from "./_components/signup-complete-client";

export default async function SignupCompletePage() {
  // Reached at the freshly-created business's own subdomain, so this
  // resolves in practice — but the shell handles `null` (platform root)
  // defensively like every other auth page.
  const business = await api.business.simplifiedGet();

  return (
    <DefaultAuthShell
      business={business}
      headline="Your store is ready"
      subhead="Check your email to verify your account."
      badgeView={null}
      legalFooter="generic"
    >
      <SignupCompleteClient />
    </DefaultAuthShell>
  );
}

export const metadata = {
  title: "Signup Complete",
};
