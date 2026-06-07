import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { SledgeCheckoutContents } from "./sledge-checkout-contents";

export async function SledgeCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  return <SledgeCheckoutContents business={business} />;
}
