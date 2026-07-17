import { api } from "~/trpc/server";
import { DefaultSignUpPage } from "~/app/(storefront)/_templates/default/auth/default-sign-up-page";

export const metadata = {
  title: "Sign Up",
};

type Props = {
  searchParams: Promise<{
    redirectTo?: string;
    redirect?: string;
    callbackUrl?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const sp = await searchParams;
  const redirectTo = sp.redirectTo ?? sp.redirect ?? sp.callbackUrl;

  const business = await api.business.simplifiedGet();

  // No business (e.g. platform domain — an invited team member creating their
  // account) — render a bare platform sign-up rather than 404ing.
  if (!business) {
    return <DefaultSignUpPage business={null} redirectTo={redirectTo} />;
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignUpPage,
    }[business.templateId] ?? DefaultSignUpPage;

  return <TemplateComponent business={business} redirectTo={redirectTo} />;
}
