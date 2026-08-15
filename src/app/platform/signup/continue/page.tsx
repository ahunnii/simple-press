import { DefaultAuthShell } from "~/app/(storefront)/_templates/default/auth/default-auth-shell";

import { SignupContinueClient } from "./signup-continue-client";

/**
 * Post-verification landing for invited-owner signup.
 * `callbackURL` from signUp.email points here so store creation can resume
 * after `requireEmailVerification` blocked the immediate onboarding call.
 */
export default function SignupContinuePage() {
  return (
    <DefaultAuthShell
      business={null}
      headline="Almost there"
      subhead="We're finishing your store setup."
      badgeView={null}
      legalFooter="generic"
    >
      <SignupContinueClient />
    </DefaultAuthShell>
  );
}

export const metadata = {
  title: "Continue Signup",
};
