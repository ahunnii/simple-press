import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";

/**
 * Shared collapsible-section nodes (`details` / `detailsSummary` /
 * `detailsContent`), configured once for every half of the render pipeline:
 * the storefront renderer, the WordPress / site export, and the admin editor.
 *
 * `@tiptap/extension-details` (MIT) is safe to import from a plain node
 * context: it only touches `document` inside its editor node views, which
 * `getSchema` / `generateHTML` never call. So unlike Gallery/Embed/Form, the
 * real extensions can sit in `RENDERER_BASE_EXTENSIONS`, and the editor
 * reuses these exact configured nodes (with the package's own toggle node
 * view).
 *
 * `persist: false` means no `open` attr exists in the schema, so a stored
 * `open: true` is dropped by `sanitizeTiptapDoc` and every collapsible
 * renders closed on the storefront.
 *
 * Markup (both `renderHTML` and the hand-built shells in `TiptapRenderer` /
 * the exporter):
 *
 *   <details class="sp-details">
 *     <summary class="sp-details__summary">…inline…</summary>
 *     <div class="sp-details__content" data-type="detailsContent">…blocks…</div>
 *   </details>
 */

/** The `<details>` element. */
export const DETAILS_CLASS = "sp-details";

/** The `<summary>` element. */
export const DETAILS_SUMMARY_CLASS = "sp-details__summary";

/** The content wrapper after the summary. */
export const DETAILS_CONTENT_CLASS = "sp-details__content";

/** `data-type` the content wrapper carries (the package's own parse hook). */
export const DETAILS_CONTENT_DATA_TYPE = "detailsContent";

export const DetailsNode = Details.configure({
  persist: false,
  HTMLAttributes: { class: DETAILS_CLASS },
});

export const DetailsSummaryNode = DetailsSummary.configure({
  HTMLAttributes: { class: DETAILS_SUMMARY_CLASS },
});

export const DetailsContentNode = DetailsContent.configure({
  HTMLAttributes: { class: DETAILS_CONTENT_CLASS },
});

/** The configured trio, in registration order. */
export const DETAILS_EXTENSIONS = [
  DetailsNode,
  DetailsSummaryNode,
  DetailsContentNode,
];
