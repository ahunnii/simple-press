import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { env } from "~/env";
import { enforceCanonicalHost } from "~/lib/canonical";
import { resolveMaintenanceGate } from "~/lib/preview/maintenance-preview-context";
import { api, HydrateClient } from "~/trpc/server";
import { TemplateSelectorDevTool } from "~/components/development/template-selector";
import { MaintenancePreviewBar } from "~/components/maintenance/maintenance-preview-bar";
import { MaintenanceTakeover } from "~/components/maintenance/maintenance-takeover";
import { PreviewFieldPatcher } from "~/components/preview/preview-field-patcher";
import { PreviewOverlay } from "~/components/preview/preview-overlay";
import { StorefrontFlagsProvider } from "~/providers/feature-flags-context";

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

  const t = getTemplate(business.templateId);
  const gate = await resolveMaintenanceGate(business.id, business.maintenance);

  if (business.maintenance.active && gate.kind === "takeover") {
    return (
      <MaintenanceTakeover
        business={business}
        maintenance={business.maintenance}
        template={t}
        showEnterBar={gate.showEnterBar}
      />
    );
  }

  return (
    <HydrateClient>
      <StorefrontFlagsProvider flags={business.featureFlags}>
        {gate.showPreviewBar ? (
          <MaintenancePreviewBar mode="leave" variant={gate.variant} />
        ) : null}
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
