/**
 * umsc-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { UmscServicePage } from "./umsc-service-page";

export const UMSC_SERVICE_COMPONENTS: Record<string, ServiceTemplateComponent> =
  {
    "umsc-service": UmscServicePage,
  };
