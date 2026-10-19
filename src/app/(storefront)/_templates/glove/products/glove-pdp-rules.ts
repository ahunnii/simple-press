/**
 * Which products count as made-to-order gloves: members of the
 * `notice-collection-slug` collection, or every product when that slug is
 * blank. Gloves get the made-to-order notice, the numbered steps (variant
 * rows, then their option groups) and the Easy Guide banner; charms, chains
 * and gift cards get none of them. Chains and charms themselves come from the
 * product's option groups, shown for any product that has them.
 */
export function isGloveMadeToOrder(
  noticeSlug: string,
  collectionSlugs: readonly string[],
): boolean {
  const slug = noticeSlug.trim();
  return slug === "" || collectionSlugs.includes(slug);
}

/**
 * The Easy Guide banner explains the glove options, so it only shows on
 * made-to-order gloves, when its section is visible and it has text.
 */
export function showGloveEasyGuide({
  madeToOrder,
  sectionVisible,
  text,
}: {
  madeToOrder: boolean;
  sectionVisible: boolean;
  text: string;
}): boolean {
  return madeToOrder && sectionVisible && text.trim() !== "";
}
