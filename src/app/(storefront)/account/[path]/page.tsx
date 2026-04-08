import { notFound } from "next/navigation";
import { AccountView } from "@daveyplate/better-auth-ui";
import { accountViewPaths } from "@daveyplate/better-auth-ui/server";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import { HappyBambooAccountSecurityPage } from "../../_templates/happy-bamboo/account/happy-bamboo-account-security-page";
import { HappyBambooAccountSettingsPage } from "../../_templates/happy-bamboo/account/happy-bamboo-account-settings-page";

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

  if (business.templateId === "happy-bamboo") {
    if (path === accountViewPaths.SECURITY) {
      return <HappyBambooAccountSecurityPage />;
    }
    return <HappyBambooAccountSettingsPage />;
  }

  const templateStyle =
    {
      "dark-trend": "bg-[#424242]",
      pollen: "py-24 md:py-36",
    }[business.templateId] ?? "";

  return (
    <div className={cn("py-20", templateStyle)}>
      <AccountView path={path} className="mx-auto max-w-7xl" classNames={{}} />
    </div>
  );
}
