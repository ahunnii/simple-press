/**
 * Aggregated field / section registry for olive's cart + checkout domain.
 *
 * The template root (`_templates/olive/index.ts`) and `sections.ts` are owned
 * by the orchestrator; this barrel just re-exports the six names so either
 * file can pull them from one place. The definitions themselves live in
 * `cart-fields.ts` and `checkout-fields.ts`.
 */
export {
  oliveCartData,
  oliveCartFieldGroups,
  oliveCartSections,
} from "./cart-fields";
export {
  oliveCheckoutData,
  oliveCheckoutFieldGroups,
  oliveCheckoutSections,
} from "./checkout-fields";
