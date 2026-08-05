import { api } from "~/trpc/server";
import { DefaultAuthRedirectPage } from "~/app/(storefront)/_templates/default/auth/default-auth-redirect-page";

/**
 * Interstitial that forwards an already-authenticated visitor on to their
 * destination. Target of the auth UI's `viewPaths.auth.redirect` navigation.
 */
export default async function AuthRedirectPage() {
  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultAuthRedirectPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Redirecting…",
  robots: { index: false, follow: false },
};
