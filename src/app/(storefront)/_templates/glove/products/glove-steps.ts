import type { GloveOptionGroup } from "./glove-color";

import { gloveStepForOption } from "./glove-color";

/**
 * Easy Guide order for a made-to-order glove (2 Color, 3 Size, 4 Grommet),
 * whatever order the owner entered the options in; dimensions the guide has
 * no step for trail in their original order. Other products keep entry order.
 */
export function orderGloveGroups<T extends { key: string }>(
  groups: T[],
  numbered: boolean,
): T[] {
  if (!numbered) return groups;
  return groups
    .map((group, index) => ({ group, index }))
    .sort(
      (a, b) =>
        (gloveStepForOption(a.group.key) ?? 99) -
          (gloveStepForOption(b.group.key) ?? 99) || a.index - b.index,
    )
    .map(({ group }) => group);
}

/**
 * Contiguous step numbers for the configurator rows actually on the page.
 * Only dimensions the Easy Guide knows get a number; they are numbered 1, 2,
 * 3 ... in display order, so a glove without a Grommet option reads 1, 2, 3
 * instead of skipping to the guide's own 2, 3, 5. `next` is the number the
 * add-on picker's first row starts at.
 */
export function gloveStepPlan(
  orderedKeys: string[],
  numbered: boolean,
): { options: Record<string, number>; next: number } {
  const options: Record<string, number> = {};
  let next = 1;
  if (numbered) {
    for (const key of orderedKeys) {
      if (gloveStepForOption(key) === null) continue;
      options[key] = next;
      next += 1;
    }
  }
  return { options, next };
}

/**
 * The spec-table rows still worth showing: a dimension that already has an
 * option selector on the page (same name, case-insensitive) says nothing new.
 */
export function visibleSpecGroups(
  groups: GloveOptionGroup[],
  selectorKeys: string[],
): GloveOptionGroup[] {
  const covered = new Set(selectorKeys.map((key) => key.trim().toLowerCase()));
  return groups.filter((group) => !covered.has(group.key.trim().toLowerCase()));
}
