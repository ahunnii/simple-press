/**
 * Wealth-specific service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { WealthEssayServicePage } from "./wealth-essay-service-page";
import { WealthProgramServicePage } from "./wealth-program-service-page";

export const WEALTH_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "wealth-essay": WealthEssayServicePage,
  "wealth-program": WealthProgramServicePage,
};
