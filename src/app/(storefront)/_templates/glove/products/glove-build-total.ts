import type {
  CustomizerSelectedText,
  CustomizerSelectedValue,
} from "~/components/customizer";
import { formatPrice } from "~/lib/prices";

/**
 * Wording for the product-options path ("Glove $160 · Chain $25 · Charm
 * included → Total $185"). Pure so the picker and its tests share it.
 */

type LabelCopy = {
  chainLabel: string;
  charmsLabel: string;
  charmLine: string;
};

/**
 * One pick's name in the running total: the singular of its group's name.
 * Uses the template's own "Charm" wording for the group called like its
 * charms row; otherwise drops a plural "s" from a multi-pick group
 * ("Charms" -> "Charm", "Berries" -> "Berry"), and keeps a single-pick
 * group's name as is.
 */
export function pickLineLabel(
  groupName: string,
  multiple: boolean,
  copy: LabelCopy,
): string {
  const name = groupName.trim();
  const lower = name.toLowerCase();
  if (copy.charmLine && lower === copy.charmsLabel.trim().toLowerCase()) {
    return copy.charmLine;
  }
  if (!multiple) {
    return lower === copy.chainLabel.trim().toLowerCase() && copy.chainLabel
      ? copy.chainLabel
      : name;
  }
  if (/ies$/i.test(name) && name.length > 4) return `${name.slice(0, -3)}y`;
  if (/s$/i.test(name) && !/ss$/i.test(name) && name.length > 3) {
    return name.slice(0, -1);
  }
  return name;
}

/**
 * The parts joined into the running-total line: the glove first, then every
 * chosen value in group order, then filled text options. Amounts are per
 * line (unit price x quantity).
 */
export function gloveBuildTotalParts({
  gloveLine,
  gloveAmount,
  quantity,
  values,
  texts,
  lineLabel,
}: {
  gloveLine: string;
  /** Glove line amount (unit price x quantity). */
  gloveAmount: number;
  quantity: number;
  values: readonly CustomizerSelectedValue[];
  texts: readonly CustomizerSelectedText[];
  /** Name for a pick of this group in the line. */
  lineLabel: (groupId: string, groupName: string) => string;
}): string[] {
  const parts = [`${gloveLine} ${formatPrice(gloveAmount)}`];
  for (const value of values) {
    const label = lineLabel(value.groupId, value.groupName);
    if (value.included) parts.push(`${label} included`);
    else if (value.price > 0) {
      parts.push(`${label} ${formatPrice(value.price * quantity)}`);
    } else parts.push(value.label);
  }
  for (const text of texts) {
    parts.push(
      text.price > 0
        ? `${text.groupName} ${formatPrice(text.price * quantity)}`
        : text.groupName,
    );
  }
  return parts;
}
