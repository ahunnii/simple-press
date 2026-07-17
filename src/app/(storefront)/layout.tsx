import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { env } from "~/env";
import { enforceCanonicalHost } from "~/lib/canonical";
import { StorefrontFlagsProvider } from "~/providers/feature-flags-context";
import { api, HydrateClient } from "~/trpc/server";
import { TemplateSelectorDevTool } from "~/components/development/template-selector";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { PreviewFieldPatcher } from "~/components/preview/preview-field-patcher";
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
  // Skipped in development so custom-domain businesses stay reachable locally.
  if (env.NODE_ENV !== "development") {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const pathname = headersList.get("x-pathname") ?? "/";
    const canonicalUrl = enforceCanonicalHost(business, host, pathname);
    if (canonicalUrl) {
      permanentRedirect(canonicalUrl);
    }
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
      <StorefrontFlagsProvider flags={business.featureFlags}>
        <t.Layout business={business}>
          <>{children}</>
        </t.Layout>
        <CartRevalidator />
        <PreviewOverlay />
        <PreviewFieldPatcher />
        <TemplateSelectorDevTool />
      </StorefrontFlagsProvider>
    </HydrateClient>
  );
}
