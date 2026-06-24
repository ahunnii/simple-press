/**
 * Vii-specific service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { ViiAtelierServicePage } from "./vii-atelier-service-page";
import { ViiLedgerServicePage } from "./vii-ledger-service-page";
import { ViiRitualServicePage } from "./vii-ritual-service-page";
import { ViiSanctuaryServicePage } from "./vii-sanctuary-service-page";

export const VII_SERVICE_COMPONENTS: Record<string, ServiceTemplateComponent> =
  {
    "vii-sanctuary": ViiSanctuaryServicePage,
    "vii-ritual": ViiRitualServicePage,
    "vii-atelier": ViiAtelierServicePage,
    "vii-ledger": ViiLedgerServicePage,
  };
