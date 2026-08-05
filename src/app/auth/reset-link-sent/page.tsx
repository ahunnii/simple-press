import { api } from "~/trpc/server";
import { DefaultResetLinkSentPage } from "~/app/(storefront)/_templates/default/auth/default-reset-link-sent-page";

/**
 * Confirmation shown after a password-reset request, and the target of the auth
 * UI's `viewPaths.auth.resetLinkSent` navigation from the forgot-password form.
 */
export default async function ResetLinkSentPage() {
  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultResetLinkSentPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};
