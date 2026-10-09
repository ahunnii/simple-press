import type { ServiceTemplateDef } from "~/lib/service-templates";

import { gloveServiceFieldGroups, gloveServiceFields } from "./index";

/**
 * glove's service detail variants. One variant; as the storefront's only
 * def it is also its default, so every service on a glove store renders
 * `GloveServicePage` regardless of the id saved on the Service row.
 */
export const gloveServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "glove-service",
    label: "Glove",
    description:
      "A service page matching the glove storefront — title band, photo with intro, option cards with booking, and a closing booking banner.",
    fields: gloveServiceFields,
    fieldGroups: gloveServiceFieldGroups,
  },
];
