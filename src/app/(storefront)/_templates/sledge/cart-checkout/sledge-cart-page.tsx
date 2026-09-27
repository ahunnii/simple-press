import type { DefaultCartPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import {
  SLEDGE_CART_REASSURANCE_DEFAULTS,
  SLEDGE_CART_REASSURANCE_KEY,
} from "./cart-fields";
import { SledgeCartContents } from "./sledge-cart-contents";
import { resolveSledgeTextList } from "./text-list";

export async function SledgeCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, ["sledge.cart.empty-text"]);

  return (
    <SledgeCartContents
      business={business}
      emptyText={f["sledge.cart.empty-text"] ?? ""}
      reassuranceLines={resolveSledgeTextList(
        customFields,
        SLEDGE_CART_REASSURANCE_KEY,
        SLEDGE_CART_REASSURANCE_DEFAULTS,
      )}
    />
  );
}
