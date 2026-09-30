import type { ServiceTemplateDef } from "~/lib/service-templates";

import { umscServiceFieldGroups, umscServiceFields } from "./index";

/**
 * umsc's service detail variants. One variant; as the storefront's only def
 * it is also its default, so every service on a umsc store renders
 * `UmscServicePage` regardless of the id saved on the Service row.
 */
export const umscServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "umsc-service",
    label: "Unique Monique",
    description:
      "A service page matching the umsc storefront — black title band, wide photo, intro, option cards and a closing band with a button or booking widget.",
    fields: umscServiceFields,
    fieldGroups: umscServiceFieldGroups,
  },
];
