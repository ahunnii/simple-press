export type NumberedSection =
  | "first-section"
  | "second-section"
  | "products"
  | "cta";

/**
 * Two-digit labels ("01.", "02.", …) for the numbered homepage sections, in
 * order, counting only the visible ones. Hidden sections get no label.
 */
export function numberVisibleSections(
  sections: [NumberedSection, boolean][],
): Partial<Record<NumberedSection, string>> {
  const labels: Partial<Record<NumberedSection, string>> = {};
  let n = 0;
  for (const [id, visible] of sections) {
    if (!visible) continue;
    n += 1;
    labels[id] = `${String(n).padStart(2, "0")}.`;
  }
  return labels;
}
