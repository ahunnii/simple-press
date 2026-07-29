/**
 * Service template component registry.
 *
 * Maps serviceTemplateId → the React page component for that template.
 * This is intentionally separate from `src/lib/service-templates.ts`, which
 * is a field/metadata registry with no React component references (it is
 * imported by the admin UI which must not pull in server components).
 *
 * Per-storefront component maps live in:
 *   pollen: _templates/pollen/services/service-pages/components.ts
 *   vii:    _templates/vii/services/service-pages/components.ts
 */
import type { ComponentType } from "react";

import type { RouterOutputs } from "~/trpc/react";
import {
  getDefaultServiceTemplateId,
  getServiceTemplatesForStorefront,
} from "~/lib/service-templates";

import { BUILDERS_SERVICE_COMPONENTS } from "../builders/services/service-pages/components";
import { DEFAULT_SERVICE_COMPONENTS } from "../default/services/service-pages/components";
import { PINK_SERVICE_COMPONENTS } from "../pink/services/service-pages/components";
import { POLLEN_SERVICE_COMPONENTS } from "../pollen/services/service-pages/components";
import { VII_SERVICE_COMPONENTS } from "../vii/services/service-pages/components";
import { ServiceTemplateOne } from "./service-one/service-one-page";
import { ServiceTemplateThree } from "./service-three/service-three-page";
import { ServiceTemplateTwo } from "./service-two/service-two-page";

export type ServiceTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  service: RouterOutputs["services"]["getBySlug"];
  items: RouterOutputs["services"]["getBySlug"]["items"];
  embedsEnabled: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceTemplateComponent = ComponentType<any>;

/** Flat map of all generic service template components. */
const GENERIC_SERVICE_COMPONENTS: Record<string, ServiceTemplateComponent> = {
  "service-one": ServiceTemplateOne,
  "service-two": ServiceTemplateTwo,
  "service-three": ServiceTemplateThree,
};

/**
 * Merged flat component map: generic + all per-storefront maps.
 * Per-storefront components take precedence if ids somehow collide (they
 * should not — storefront-specific ids are namespaced, e.g. "pollen-spa").
 */
export const SERVICE_TEMPLATE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  ...GENERIC_SERVICE_COMPONENTS,
  ...DEFAULT_SERVICE_COMPONENTS,
  ...POLLEN_SERVICE_COMPONENTS,
  ...VII_SERVICE_COMPONENTS,
  ...BUILDERS_SERVICE_COMPONENTS,
  ...PINK_SERVICE_COMPONENTS,
};

/**
 * Returns the component to render for the given storefront + service template.
 *
 * Resolution order:
 *  1. If `serviceTemplateId` belongs to the storefront's template set AND a
 *     component is registered for it → use that component.
 *  2. Else fall back to the component for the storefront's default template id.
 *  3. Else fall back unconditionally to `ServiceTemplateOne`.
 */
export function getServiceTemplateComponent(
  storefrontTemplateId: string,
  serviceTemplateId: string,
): ServiceTemplateComponent {
  // Check if the requested id is in this storefront's set
  const storefrontDefs = getServiceTemplatesForStorefront(storefrontTemplateId);
  const defIds = new Set(storefrontDefs.map((d) => d.id));

  if (defIds.has(serviceTemplateId)) {
    const component = SERVICE_TEMPLATE_COMPONENTS[serviceTemplateId];
    if (component !== undefined) return component;
  }

  // Fall back to the storefront's default service template
  const defaultId = getDefaultServiceTemplateId(storefrontTemplateId);
  const defaultComponent = SERVICE_TEMPLATE_COMPONENTS[defaultId];
  if (defaultComponent !== undefined) return defaultComponent;

  // Ultimate fallback
  return ServiceTemplateOne;
}
