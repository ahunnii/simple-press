import { api } from "~/trpc/server";
import { DefaultSignInPage } from "~/app/(storefront)/_templates/default/auth/default-sign-in-page";

type Props = {
  searchParams: Promise<{ redirectTo: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;

  const business = await api.business.simplifiedGet();

  // No business (e.g. platform.* subdomain) — render a bare platform sign-in.
  if (!business) {
    return <DefaultSignInPage business={null} redirectTo={redirectTo ?? "/"} />;
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignInPage,
    }[business.templateId] ?? DefaultSignInPage;

  return <TemplateComponent business={business} redirectTo={redirectTo} />;
}

export const metadata = {
  title: "Sign In",
};
