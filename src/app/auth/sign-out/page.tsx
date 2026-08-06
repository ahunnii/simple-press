import { api } from "~/trpc/server";
import { DefaultSignOutPage } from "~/app/(storefront)/_templates/default/auth/default-sign-out-page";

export default async function AuthPage() {
  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {}[business?.templateId ?? "default"] ?? DefaultSignOutPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Sign Out",
};
