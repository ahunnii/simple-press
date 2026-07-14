import { api } from "~/trpc/server";
import { DefaultResetPasswordPage } from "~/app/(storefront)/_templates/default/auth/default-reset-password-page";

type Props = {
  searchParams: Promise<{ redirectTo: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;

  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultResetPasswordPage;

  return <TemplateComponent business={business} redirectTo={redirectTo} />;
}

export const metadata = {
  title: "Reset Password",
};
