import type { RouterOutputs } from "~/trpc/react";

import { DarkTrendHeader } from "../_templates/dark-trend/dark-trend-header";
import { DefaultHeader } from "../_templates/default/default-header";
import { ModernHeader } from "../_templates/modern/modern-header";

type StorefrontHeaderProps = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export async function StorefrontHeader({ business }: StorefrontHeaderProps) {
  const templateId = business.templateId;
  if (templateId === "dark-trend") {
    return <DarkTrendHeader business={business} />;
  }
  if (templateId === "modern") {
    return <ModernHeader business={business} />;
  }
  return <DefaultHeader business={business} />;
}
