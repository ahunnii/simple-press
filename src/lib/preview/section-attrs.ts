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

/**
 * Returns the data attribute object for a live-patchable text element.
 * Spread onto an element whose ENTIRE text content is one resolved
 * text/textarea template field — the editor patches its textContent in
 * place while the owner types, instead of reloading the preview iframe.
 *
 * Usage: <h1 {...fieldAttr("vii.homepage.hero-heading")}>{heroHeading}</h1>
 *
 * Do NOT use on elements that interpolate a field into a larger string,
 * render the field inside an attribute (alt/aria-label), or transform the
 * value — those fall back to the draft-save + refresh path.
 */
export function fieldAttr(key: string) {
  return { "data-sp-field": key } as const;
}

/**
 * Returns the data attribute object for one rendered row of a `list`
 * template field. Spread onto the row's root element so a click on that row
 * in the editor preview opens the owning section AND expands + focuses the
 * matching row in the list editor (see `resolvePreviewTarget`).
 *
 * Usage: <li {...listItemAttr("bamboo.homepage.hero-badges", index)}>
 *
 * `index` is the 0-based position in the rendered list. When the storefront
 * renders built-in default rows for an empty list, the index points past the
 * saved rows — the list editor ignores out-of-range indexes, so the click
 * just opens the section.
 */
export function listItemAttr(fieldKey: string, index: number) {
  return { "data-sp-item": `${fieldKey}#${index}` } as const;
}
