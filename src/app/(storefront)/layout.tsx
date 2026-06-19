import { notFound } from "next/navigation";

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
