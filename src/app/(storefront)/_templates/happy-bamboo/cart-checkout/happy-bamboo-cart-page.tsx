import Link from "next/link";

import type { DefaultCartPageTemplateProps } from "../../types";

import { HappyBambooCartContents } from "./happy-bamboo-cart-contents";

export async function HappyBambooCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return <HappyBambooCartContents business={business} />;
}
