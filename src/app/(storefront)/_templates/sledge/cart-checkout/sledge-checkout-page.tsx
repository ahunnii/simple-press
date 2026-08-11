import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { SledgeCheckoutContents } from "./sledge-checkout-contents";

export async function SledgeCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  return (
    <SledgeCheckoutContents
      business={business}
      merchantPolicies={merchantPolicies}
    />
  );
}
