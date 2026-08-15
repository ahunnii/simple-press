import { redirect } from "next/navigation";

import { canonicalRedirectUrl } from "~/lib/auth-paths";
import { api } from "~/trpc/server";
import { DefaultSignInPage } from "~/app/(storefront)/_templates/default/auth/default-sign-in-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: Props) {
  const sp = await searchParams;

  // The form reads its destination from `?redirectTo` on the client and never
  // sees server props, so normalize the legacy `?redirect=` / `?callbackUrl=`
  // names here — and drop any off-origin value — before it gets that far.
  const canonical = canonicalRedirectUrl("/auth/sign-in", sp);
  if (canonical) redirect(canonical);

  const business = await api.business.simplifiedGet();

  // No business (e.g. platform.* subdomain) — render a bare platform sign-in.
  if (!business) {
    return <DefaultSignInPage business={null} />;
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignInPage,
    }[business.templateId] ?? DefaultSignInPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Sign In",
};
