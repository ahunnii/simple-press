import type { ServiceTemplateDef } from "~/lib/service-templates";

import {
  happyBambooServiceFieldGroups,
  happyBambooServiceFields,
} from "./index";

export const happyBambooServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "happy-bamboo-service",
    label: "Happy Bamboo",
    description:
      "A warm, editorial service page matching the Happy Bamboo storefront — header shelf, intro, service list, and a closing call-to-action.",
    fields: happyBambooServiceFields,
    fieldGroups: happyBambooServiceFieldGroups,
  },
];
