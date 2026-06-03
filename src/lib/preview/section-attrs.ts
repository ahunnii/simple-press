/**
 * Returns the data attribute object for a preview-annotated section.
 * Spread this onto the root element of each annotated section so the
 * preview overlay can map it to the corresponding editor field group.
 *
 * Usage (server or client component):
 *   <section {...sectionGroupAttr("homepage", "hero")}>
 *
 * The `data-sp-group` value matches the `TemplateFieldGroup.id` format:
 *   `${page}.${group}`   e.g. "homepage.hero"
 */
export function sectionGroupAttr(page: string, group: string) {
  return { "data-sp-group": `${page}.${group}` } as const;
}
