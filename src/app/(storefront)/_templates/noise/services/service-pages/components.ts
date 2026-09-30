/**
 * noise-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { NoiseServicePage } from "./noise-service-page";

export const NOISE_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "noise-service": NoiseServicePage,
};
