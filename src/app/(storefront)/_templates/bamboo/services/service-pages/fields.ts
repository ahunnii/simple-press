import type { ServiceTemplateDef } from "~/lib/service-templates";

import { bambooServiceFieldGroups, bambooServiceFields } from "./index";

export const bambooServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "bamboo-service",
    label: "Bamboo",
    description:
      "A warm, editorial service page matching the bamboo storefront — back-link shelf, intro, service list, and a closing call-to-action.",
    fields: bambooServiceFields,
    fieldGroups: bambooServiceFieldGroups,
  },
];
