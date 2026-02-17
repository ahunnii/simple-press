import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { DefaultSignUpPage } from "~/app/(storefront)/_templates/default/default-sign-up-page";

export const metadata = {
  title: "Sign Up",
};
export default async function SignUpPage() {
  const business = await api.business.simplifiedGet();

  if (!business) {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignUpPage,
    }[business.templateId] ?? DefaultSignUpPage;

  return <TemplateComponent business={business} />;
}
