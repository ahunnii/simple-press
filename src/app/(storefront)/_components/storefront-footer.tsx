import type { RouterOutputs } from "~/trpc/react";

import { DefaultFooter } from "../_templates/default/default-footer";
import { ModernFooter } from "../_templates/modern/modern-footer";

export type FooterBusiness = {
  name: string;
  templateId: string;
  siteContent: {
    footerText: string | null;
  } | null;
};

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export async function StorefrontFooter({ business }: Props) {
  const templateId = business.templateId;

  if (templateId === "modern") {
    return <ModernFooter business={business} />;
  }

  return <DefaultFooter business={business} />;
}
