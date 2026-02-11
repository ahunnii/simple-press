import { notFound } from "next/navigation";
import { AccountView, UpdateAvatarCard } from "@daveyplate/better-auth-ui";
import { accountViewPaths } from "@daveyplate/better-auth-ui/server";

import { api } from "~/trpc/server";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  return (
    <main className="container p-4 md:p-6">
      <StorefrontHeader business={business} />
      <AccountView path={path} className="pt-36" />
      <StorefrontFooter business={business} />
    </main>
  );
}
