import {
  customizationLines,
  readCustomizationSnapshot,
} from "~/lib/customizer";

import { OptionLines } from "./cart-line-options";

/**
 * Options under a storefront order line (account order detail, order
 * status). Takes the raw `OrderItem.customization` JSON; renders nothing for
 * a plain line, an unknown snapshot version or malformed data.
 */
export function OrderItemOptions({
  customization,
  ...rest
}: {
  customization: unknown;
} & Omit<Parameters<typeof OptionLines>[0], "lines">) {
  const snapshot = readCustomizationSnapshot(customization);
  if (!snapshot) return null;
  return <OptionLines lines={customizationLines(snapshot)} {...rest} />;
}
