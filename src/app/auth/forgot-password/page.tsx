import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import { canonicalRedirectUrl } from "~/lib/auth-paths";
import { DefaultForgotPasswordPage } from "~/app/(storefront)/_templates/default/auth/default-forgot-password-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;

  // See the note in ../sign-in/page.tsx.
  const canonical = canonicalRedirectUrl("/auth/forgot-password", sp);
  if (canonical) redirect(canonical);

  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultForgotPasswordPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Forgot your password?",
};
