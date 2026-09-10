import { notFound } from "next/navigation";

import { resolveDonationLabel } from "~/lib/donations/label";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function DonatePage({ searchParams }: Props) {
  const params = await searchParams;

  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("donations")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  const t = getTemplate(business.templateId);
  // DonatePage is optional in TemplateComponentSet (some templates may never
  // implement it), but defaultEntry always provides one, so this only
  // guards TypeScript's optional-slot typing — it should never 404 in
  // practice while the "donations" flag is on.
  if (!t.DonatePage) notFound();

  return <t.DonatePage business={business} status={params.status} />;
}

export async function generateMetadata() {
  const business = await loadSeoBusiness("/donate");
  const label = resolveDonationLabel(business?.donationLabel);
  return buildPageMetadata({
    business,
    path: "/donate",
    pageMetaKey: "donate",
    title: label.pageTitle,
  });
}
