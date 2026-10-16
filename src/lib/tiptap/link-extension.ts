import type { LinkOptions } from "@tiptap/extension-link";
import Link from "@tiptap/extension-link";

/**
 * Shared `link` mark: the stock Link extension plus a `variant` attr that
 * turns a link into a call-to-action button.
 *
 * This module must stay free of React, tRPC and `server-only` — it is
 * imported by the storefront renderer's schema (`RENDERER_BASE_EXTENSIONS`,
 * which the WordPress / site export also renders with) and by the admin
 * editor, each through `createLinkExtension` with its own options.
 *
 * Markup for a button link:
 *
 *   <a href="…" data-variant="solid" class="sp-button sp-button--solid">…</a>
 *   <a href="…" data-variant="outline" class="sp-button sp-button--outline">…</a>
 *
 * A plain link (`variant: null`, or anything unrecognised) carries neither.
 * Stored `class` attrs are always refused by `sanitizeTiptapDoc`, so these
 * classes can only ever come from this `renderHTML`, from a known variant.
 */

/** Button styles a link may take. `null` (the default) is an ordinary link. */
export const LINK_VARIANTS = ["solid", "outline"] as const;

export type LinkVariant = (typeof LINK_VARIANTS)[number];

/** Base class every button link carries; the variant modifier is appended. */
export const BUTTON_LINK_CLASS = "sp-button";

/** Schemes a link may point at, in the editor and on the storefront alike. */
export const LINK_PROTOCOLS = ["http", "https", "mailto", "tel"];

const VARIANT_SET: ReadonlySet<string> = new Set(LINK_VARIANTS);

/** Narrows any stored/parsed value to a known variant, or `null` (plain link). */
export function coerceLinkVariant(value: unknown): LinkVariant | null {
  return typeof value === "string" && VARIANT_SET.has(value)
    ? (value as LinkVariant)
    : null;
}

/** `class` for a button link of this variant, e.g. `"sp-button sp-button--solid"`. */
export function buttonLinkClassName(variant: LinkVariant): string {
  return `${BUTTON_LINK_CLASS} ${BUTTON_LINK_CLASS}--${variant}`;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    // A second `setLink` signature (TipTap intersects command groups, so this
    // becomes an overload of the stock one) that also accepts `variant`.
    // The stock command passes its attributes straight to `setMark`, so no
    // runtime change is needed for the attr to land.
    buttonLink: {
      setLink: (attributes: {
        href: string;
        target?: string | null;
        rel?: string | null;
        class?: string | null;
        title?: string | null;
        variant?: LinkVariant | null;
      }) => ReturnType;
    };
  }
}

/** The stock Link mark with the `variant` attr. Configure it via `createLinkExtension`. */
export const ButtonLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      variant: {
        default: null,
        parseHTML: (element) =>
          coerceLinkVariant(element.getAttribute("data-variant")),
        renderHTML: (attributes) => {
          const variant = coerceLinkVariant(attributes.variant);
          if (!variant) return {};
          // `class` here is merged (not overwritten) with the Link's own
          // `class` attr / `HTMLAttributes.class` by TipTap's
          // `mergeAttributes`, so the editor's `link` class is kept.
          return {
            "data-variant": variant,
            class: buttonLinkClassName(variant),
          };
        },
      },
    };
  },
});

/**
 * The configured shared link. Both callers keep `LINK_PROTOCOLS`:
 *  - renderer: `HTMLAttributes: { rel: "noopener noreferrer nofollow" }`;
 *  - editor: `openOnClick: false`, `enableClickSelection: true`,
 *    `HTMLAttributes: { class: "link" }`.
 */
export function createLinkExtension(options: Partial<LinkOptions> = {}) {
  return ButtonLink.configure({
    protocols: LINK_PROTOCOLS,
    ...options,
  });
}

/**
 * True for a link to a page on the same site: a single-slash path (`/contact`)
 * or an in-page anchor (`#faq`). Protocol-relative `//host` is external.
 */
export function isInternalHref(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const value = href.trim();
  return (
    (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#")
  );
}

const EXTERNAL_REL = "noopener noreferrer nofollow";

/**
 * The storefront / export `link` mark. External links are stamped
 * `rel="noopener noreferrer nofollow"` and open in a new tab unless the stored
 * `target` says otherwise (unchanged behaviour). Internal links (`/…`, `#…`)
 * carry no `rel` and only open in a new tab when the owner explicitly asked
 * for it — a link to your own page should not be nofollowed or leave the tab.
 *
 * `target` and `rel` default to `null` here (not the stock `_blank` /
 * `rel`) so "owner chose nothing" can be told apart from "owner chose a new
 * tab"; their `renderHTML` then applies the rules above.
 */
export function createRendererLinkExtension() {
  return ButtonLink.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        target: {
          default: null,
          renderHTML: (attributes: Record<string, unknown>) => {
            const target =
              typeof attributes.target === "string" && attributes.target
                ? attributes.target
                : null;
            if (isInternalHref(attributes.href)) {
              return target ? { target } : {};
            }
            return { target: target ?? "_blank" };
          },
        },
        rel: {
          default: null,
          renderHTML: (attributes: Record<string, unknown>) =>
            isInternalHref(attributes.href) ? {} : { rel: EXTERNAL_REL },
        },
      };
    },
  }).configure({
    protocols: LINK_PROTOCOLS,
    HTMLAttributes: { target: null, rel: null, class: null },
  });
}
