/**
 * Cart + checkout domain barrel. The template root (`glove/index.ts`) and
 * `glove/sections.ts` are owned by the orchestrator; they pull the names below
 * from here. Definitions live in `cart-fields.ts`, `checkout-fields.ts` and
 * `order-fields.ts`.
 */
export {
  gloveCartData,
  gloveCartFieldGroups,
  gloveCartSections,
} from "./cart-fields";
export {
  gloveCheckoutData,
  gloveCheckoutFieldGroups,
  gloveCheckoutSections,
} from "./checkout-fields";
export {
  gloveOrderData,
  gloveOrderFieldGroups,
  gloveOrderSections,
} from "./order-fields";
