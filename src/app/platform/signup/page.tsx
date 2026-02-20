import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { WizardClient } from "./_components/wizard-client";

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function PlatformSignupPage({ searchParams }: Props) {
  const business = await api.business.simplifiedGet();

  if (business) {
    notFound();
  }

  const { code } = await searchParams;

  return <WizardClient initialCode={code} />;
}

export const metadata = {
  title: "Create Your Store",
};
