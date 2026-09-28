import type { ServiceTemplateDef } from "~/lib/service-templates";

import { oliveServiceFieldGroups, oliveServiceFields } from "./index";

/**
 * olive's service detail variants. One variant; as the storefront's only
 * def it is also its default, so every service on an olive store renders
 * `OliveServicePage` regardless of the id saved on the Service row.
 */
export const oliveServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "olive-service",
    label: "Olive",
    description:
      "A calm service page matching the olive storefront — photo title band, intro, appointment cards and a closing booking band.",
    fields: oliveServiceFields,
    fieldGroups: oliveServiceFieldGroups,
  },
];
