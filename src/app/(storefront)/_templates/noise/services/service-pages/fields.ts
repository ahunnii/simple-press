import type { ServiceTemplateDef } from "~/lib/service-templates";

import { noiseServiceFieldGroups, noiseServiceFields } from "./index";

/**
 * noise's service detail variants. One variant; as the storefront's only
 * def it is also its default, so every service on a noise store renders
 * `NoiseServicePage` regardless of the id saved on the Service row.
 */
export const noiseServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "noise-service",
    label: "Noise",
    description:
      "An editorial service page matching the noise storefront — centred title band, wide photo, intro, booking cards and a closing booking band.",
    fields: noiseServiceFields,
    fieldGroups: noiseServiceFieldGroups,
  },
];
