import { api } from "~/trpc/server";
import { DefaultVerifyEmailPage } from "~/app/(storefront)/_templates/default/auth/default-verify-email-page";

/**
 * Landing page after sign-up, and the target of the auth UI's
 * `viewPaths.auth.verifyEmail` navigation.
 *
 * The server sets `emailVerification.sendOnSignUp` and
 * `emailAndPassword.requireEmailVerification` (see
 * `src/server/better-auth/config.tsx`), so a new account cannot sign in until
 * the emailed link is followed. This page is where the shopper waits, and where
 * they can trigger a resend.
 */
export default async function VerifyEmailPage() {
  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultVerifyEmailPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};
