import { api } from "~/trpc/server";
import { DefaultForgotPasswordPage } from "~/app/(storefront)/_templates/default/auth/default-forgot-password-page";

type Props = {
  searchParams: Promise<{ redirectTo: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;

  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultForgotPasswordPage;

  return <TemplateComponent business={business} redirectTo={redirectTo} />;
}

export const metadata = {
  title: "Forgot your password?",
};
