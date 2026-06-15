import { notFound } from "next/navigation";
import { accountViewPaths } from "@daveyplate/better-auth-ui/server";

import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

type Props = {
  params: Promise<{ path: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { path } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const isSecurity = path === accountViewPaths.SECURITY;
  const t = getTemplate(business.templateId);

  if (isSecurity) {
    return <t.AccountSecurityPage />;
  }
  return <t.AccountSettingsPage />;
}
