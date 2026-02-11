import { DefaultHeader } from "../_templates/default/default-header";
import { ModernHeader } from "../_templates/modern/modern-header";

type Business = {
  name: string;
  templateId: string;
  siteContent: {
    logoUrl: string | null;
  } | null;
};

type StorefrontHeaderProps = {
  business: Business;
};

export async function StorefrontHeader({ business }: StorefrontHeaderProps) {
  const templateId = business.templateId;
  if (templateId === "modern") {
    return <ModernHeader business={business} />;
  }
  return <DefaultHeader business={business} />;
}
