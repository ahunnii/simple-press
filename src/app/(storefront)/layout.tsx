import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { enforceCanonicalHost } from "~/lib/canonical";
import { api, HydrateClient } from "~/trpc/server";
import { TemplateSelectorDevTool } from "~/components/development/template-selector";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { PreviewOverlay } from "~/components/preview/preview-overlay";

import { CartRevalidator } from "./_components/cart-revalidator";
import { getTemplate } from "./_templates/registry";

type Props = {
  children: React.ReactNode;
};

export default async function StorefrontLayout({ children }: Props) {
  const business = await api.business.simplifiedGetWithProducts();
  if (!business) notFound();

  // Enforce canonical host: redirect platform-subdomain visitors to the
  // custom domain when the business has an active custom domain (308 permanent).
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const pathname = headersList.get("x-pathname") ?? "/";
  const canonicalUrl = enforceCanonicalHost(business, host, pathname);
  if (canonicalUrl) {
    permanentRedirect(canonicalUrl);
  }

  if (business.maintenance?.active) {
    return (
      <MaintenanceScreen
        variant={business.maintenance.variant}
        message={business.maintenance.message}
        businessName={business.name}
      />
    );
  }

  const t = getTemplate(business.templateId);

  return (
    <HydrateClient>
      <t.Layout business={business}>
        <>{children}</>
      </t.Layout>
      <CartRevalidator />
      <PreviewOverlay />
      <TemplateSelectorDevTool />
    </HydrateClient>
  );
}
