import type { DefaultCartPageTemplateProps } from "../../types";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooCartContents } from "./bamboo-cart-contents";

export async function BambooCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  // Fragment keeps the edge a direct sibling of BambooCartContents' rendered
  // section under <main> (a column flex container), so its mt-auto pins the
  // edge to the bottom of main across all three cart states — no edit to
  // bamboo-cart-contents.tsx needed.
  return (
    <>
      <BambooCartContents business={business} />
      <BambooEdge from="paper" to="pine" variant="c" />
    </>
  );
}
