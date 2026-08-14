import { redirect } from "next/navigation";

import { canonicalRedirectUrl } from "~/lib/auth-paths";
import { api } from "~/trpc/server";
import { DefaultSignUpPage } from "~/app/(storefront)/_templates/default/auth/default-sign-up-page";

export const metadata = {
  title: "Sign Up",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const sp = await searchParams;

  // See the note in ../sign-in/page.tsx — the destination is read client-side
  // from `?redirectTo`, so it is normalized and sanitized here first.
  const canonical = canonicalRedirectUrl("/auth/sign-up", sp);
  if (canonical) redirect(canonical);

  const business = await api.business.simplifiedGet();

  // No business (e.g. platform domain — an invited team member creating their
  // account) — render a bare platform sign-up rather than 404ing.
  if (!business) {
    return <DefaultSignUpPage business={null} />;
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignUpPage,
    }[business.templateId] ?? DefaultSignUpPage;

  return <TemplateComponent business={business} />;
}
