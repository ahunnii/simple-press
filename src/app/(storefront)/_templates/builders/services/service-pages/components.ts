/**
 * Builders-specific service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { BuildersCraftServicePage } from "./builders-craft-service-page";

export const BUILDERS_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "builders-craft": BuildersCraftServicePage,
};
