import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function CheckoutPage() {
  const business = await api.business.simplifiedGet();
  const environment = process.env.NODE_ENV;
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  if (!business.isStripeConnected && environment !== "development")
    return <t.CheckoutUnavailable />;

  // Merchant terms-of-service / refund-policy pages are optional — most
  // stores never publish them (the admin only creates the Page row once the
  // owner saves non-empty content). Resolved the same way `DefaultFooter`
  // resolves its policy links, server-side, so the checkout terms notice
  // never has to fetch client-side and never links a Page that doesn't exist.
  const policyPages = await api.content.getSimplifiedPages({ type: "policy" });
  const merchantPolicies = {
    hasTermsOfService: policyPages.some((p) => p.slug === "terms-of-service"),
    hasRefundPolicy: policyPages.some((p) => p.slug === "refund-policy"),
  };

  return (
    <t.CheckoutPage business={business} merchantPolicies={merchantPolicies} />
  );
}

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};
