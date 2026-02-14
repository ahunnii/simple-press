import { notFound } from "next/navigation";
import { AccountView } from "@daveyplate/better-auth-ui";
import { accountViewPaths } from "@daveyplate/better-auth-ui/server";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

type Props = {
  params: Promise<{ path: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { path } = await params;
  const business = await api.business.get();

  if (!business) notFound();

  const templateStyle =
    {
      "dark-trend": "bg-[#424242]",
    }[business.templateId] ?? "";

  return (
    <div className={cn("py-20", templateStyle)}>
      <AccountView path={path} className="mx-auto max-w-7xl" classNames={{}} />
    </div>
  );
}
