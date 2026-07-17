import type { ServiceTemplateDef } from "~/lib/service-templates";

import { defaultServiceFieldGroups, defaultServiceFields } from "./index";

export const defaultServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "default-service",
    label: "Default",
    description:
      "A clean editorial service page matching the Default storefront — hero, intro, service list, and a closing call-to-action.",
    fields: defaultServiceFields,
    fieldGroups: defaultServiceFieldGroups,
  },
];
