/**
 * Pure helper that walks stored TipTap JSON (or any container of it — a
 * page's `content`, a service's `customFields` map, a product's
 * `additionalFields` blob) and collects every `gallery` node's id.
 *
 * Used by storefront server components to prefetch
 * `gallery.getByIdPublic` for every gallery a route is about to render via
 * `TiptapRenderer` (see `GalleryBlock` in `~/components/tiptap-renderer`),
 * so gallery images/captions land in the server-rendered HTML instead of
 * only appearing after the client-side `useQuery` resolves.
 *
 * Deliberately generic rather than doc-shaped: some surfaces (service
 * `customFields`, product `additionalFields`) store richtext as a
 * *string-encoded* JSON doc inside an otherwise plain object of template
 * field values, with the field key varying per template. Rather than
 * chasing every template's field name, this walks the whole value and
 * opportunistically parses any string that looks like JSON, so it finds
 * gallery nodes wherever they live without the caller needing to know the
 * shape in advance.
 */
export function collectGalleryIds(doc: unknown): string[] {
  const ids = new Set<string>();
  walk(doc, ids);
  return [...ids];
}

function walk(value: unknown, ids: Set<string>): void {
  if (value == null) return;

  if (typeof value === "string") {
    // Cheap pre-filter before paying for a JSON.parse + try/catch: a
    // string-encoded doc/object always starts with `{` or `[` once trimmed.
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const first = trimmed[0];
    if (first !== "{" && first !== "[") return;
    try {
      walk(JSON.parse(trimmed) as unknown, ids);
    } catch {
      // Not actually JSON (e.g. plain text that happens to start with `{`)
      // — nothing to walk.
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) walk(item, ids);
    return;
  }

  if (typeof value !== "object") return;

  const node = value as Record<string, unknown>;

  if (node.type === "gallery") {
    const attrs = node.attrs;
    if (attrs != null && typeof attrs === "object") {
      const galleryId = (attrs as Record<string, unknown>).galleryId;
      if (typeof galleryId === "string" && galleryId.length > 0) {
        ids.add(galleryId);
      }
    }
  }

  for (const key of Object.keys(node)) {
    walk(node[key], ids);
  }
}
