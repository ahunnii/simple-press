/**
 * PinkArt-specific service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { PinkTableServicePage } from "./pink-table-service-page";

export const PINK_SERVICE_COMPONENTS: Record<string, ServiceTemplateComponent> =
  {
    "pink-table": PinkTableServicePage,
  };
