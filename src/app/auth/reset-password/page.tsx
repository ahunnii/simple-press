import { redirect } from "next/navigation";

import { canonicalRedirectUrl } from "~/lib/auth-paths";
import { api } from "~/trpc/server";
import { DefaultResetPasswordPage } from "~/app/(storefront)/_templates/default/auth/default-reset-password-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;

  // See the note in ../sign-in/page.tsx. Note the reset token itself rides in
  // `?token=`, which is untouched — only the destination params are rewritten.
  const canonical = canonicalRedirectUrl("/auth/reset-password", sp);
  if (canonical) redirect(canonical);

  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultResetPasswordPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Reset Password",
};
