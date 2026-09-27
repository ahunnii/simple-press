import type { DefaultCheckoutPageTemplateProps } from "../../types";

import {
  SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
  SLEDGE_CHECKOUT_REASSURANCE_KEY,
} from "./cart-fields";
import { SledgeCheckoutContents } from "./sledge-checkout-contents";
import { resolveSledgeTextList } from "./text-list";

export async function SledgeCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  return (
    <SledgeCheckoutContents
      business={business}
      merchantPolicies={merchantPolicies}
      reassuranceLines={resolveSledgeTextList(
        business.siteContent?.customFields,
        SLEDGE_CHECKOUT_REASSURANCE_KEY,
        SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS,
      )}
    />
  );
}
