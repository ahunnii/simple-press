import { api } from "~/trpc/server";
import { DefaultSignInPage } from "~/app/(storefront)/_templates/default/auth/default-sign-in-page";

type Props = {
  searchParams: Promise<{
    redirectTo?: string;
    redirect?: string;
    callbackUrl?: string;
  }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const sp = await searchParams;
  // Callers are inconsistent about the param name (redirectTo / redirect /
  // callbackUrl). Honor all three so post-login redirects work everywhere.
  const redirectTo = sp.redirectTo ?? sp.redirect ?? sp.callbackUrl;

  const business = await api.business.simplifiedGet();

  // No business (e.g. platform.* subdomain) — render a bare platform sign-in.
  if (!business) {
    return <DefaultSignInPage business={null} redirectTo={redirectTo ?? "/"} />;
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignInPage,
    }[business.templateId] ?? DefaultSignInPage;

  return (
    <TemplateComponent business={business} redirectTo={redirectTo ?? "/"} />
  );
}

export const metadata = {
  title: "Sign In",
};
