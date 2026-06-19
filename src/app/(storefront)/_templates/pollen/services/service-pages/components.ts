/**
 * Pollen-specific service-page component map.
 *
 * Maps service template id → the React page component for that template.
 *
 * Available pollen service templates:
 *   pollen-spa   — Serene Editorial (hero + two-col intro + 3-col card grid)
 *   pollen-bloom — Gallery Forward (mosaic + centered intro + image-heavy cards)
 *   pollen-list  — Elegant List (accent stripe + centered intro + alternating rows)
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { PollenBloomServicePage } from "./pollen-bloom-service-page";
import { PollenListServicePage } from "./pollen-list-service-page";
import { PollenSpaServicePage } from "./pollen-spa-service-page";

export const POLLEN_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "pollen-spa": PollenSpaServicePage,
  "pollen-bloom": PollenBloomServicePage,
  "pollen-list": PollenListServicePage,
};
