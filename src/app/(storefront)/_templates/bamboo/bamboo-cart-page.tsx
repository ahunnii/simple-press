import Link from "next/link";

import type { DefaultCartPageTemplateProps } from "../types";

import { BambooCartContents } from "./bamboo-cart-contents";

export async function BambooCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return <BambooCartContents business={business} />;
}
