import type { TemplateComponentSet } from "~/app/(storefront)/_templates/registry";
import type { StorefrontMaintenance } from "~/lib/maintenance";
import type { RouterOutputs } from "~/trpc/react";
import { MaintenancePreviewBar } from "~/components/maintenance/maintenance-preview-bar";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";

type Business = NonNullable<
  RouterOutputs["business"]["simplifiedGetWithProducts"]
>;

type Props = {
  business: Business;
  maintenance: Extract<StorefrontMaintenance, { active: true }>;
  template: Pick<TemplateComponentSet, "MaintenancePage">;
  showEnterBar: boolean;
};

/**
 * Shared takeover used by both storefront gates. Template `MaintenancePage`s
 * are rendered unchanged; the staff enter bar is platform chrome around them.
 */
export function MaintenanceTakeover({
  business,
  maintenance,
  template,
  showEnterBar,
}: Props) {
  const MaintenancePage = template.MaintenancePage;
  const page =
    maintenance.scope === "business" && MaintenancePage ? (
      <MaintenancePage business={business} maintenance={maintenance} />
    ) : (
      <MaintenanceScreen
        variant={maintenance.variant}
        message={maintenance.message}
        cta={maintenance.scope === "business" ? maintenance.cta : null}
        businessName={business.name}
        overline={
          maintenance.scope === "business" ? maintenance.overline : null
        }
        headline={
          maintenance.scope === "business" ? maintenance.headline : null
        }
        image={maintenance.scope === "business" ? maintenance.image : null}
        location={
          maintenance.scope === "business" ? maintenance.location : null
        }
        launch={maintenance.scope === "business" ? maintenance.launch : null}
      />
    );

  if (!showEnterBar) return page;

  return (
    <>
      <MaintenancePreviewBar mode="enter" variant={maintenance.variant} />
      {page}
    </>
  );
}
