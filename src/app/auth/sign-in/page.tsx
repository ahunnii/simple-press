import { api } from "~/trpc/server";
import { DefaultSignInPage } from "~/app/(storefront)/_templates/default/default-sign-in-page";

type Props = {
  searchParams: Promise<{ redirectTo: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;

  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {
      "dark-trend": DefaultSignInPage,
    }[business.templateId] ?? DefaultSignInPage;

  return <TemplateComponent business={business} redirectTo={redirectTo} />;
}

export const metadata = {
  title: "Sign In",
};
