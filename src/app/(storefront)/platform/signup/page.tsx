import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { WizardClient } from "./_components/wizard-client";

export default async function PlatformSignupPage() {
  const business = await api.business.get();

  if (business) {
    notFound();
  }

  return <WizardClient />;
}
