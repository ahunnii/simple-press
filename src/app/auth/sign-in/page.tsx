import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthView } from "@daveyplate/better-auth-ui";
import { ArrowLeft, Leaf } from "lucide-react";

import { api } from "~/trpc/server";
import { DefaultSignInPage } from "~/app/(storefront)/_templates/default/default-sign-in-page";

type Props = {
  searchParams: Promise<{ redirectTo: string }>;
};

export const metadata = {
  title: "Sign In",
};
export default async function SignInPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;

  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DefaultSignInPage,
    }[business.templateId] ?? DefaultSignInPage;

  return <TemplateComponent business={business} redirectTo={redirectTo} />;
}
