import type { LinkOptions } from "@tiptap/extension-link";
import Link from "@tiptap/extension-link";

import { isInternalHref, resolveLinkTarget } from "./link-target";

export { isInternalHref } from "./link-target";

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
export const LINK_PROTOCOLS = ["http", "https", "mailto", "tel", "sms"];

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

const EXTERNAL_REL = "noopener noreferrer nofollow";

/**
 * The storefront / export `link` mark. External links are stamped
 * `rel="noopener noreferrer nofollow"` whatever their target. Internal links
 * (`/…`, `#…`) carry no `rel` — a link to your own page is not nofollowed.
 *
 * `target` follows `resolveLinkTarget` (see `./link-target`): stored
 * `"_blank"` → `target="_blank"`; stored `"_self"` → no `target` (same tab);
 * nothing stored → new tab for external links (the historical default, so
 * older content is unchanged), same tab for internal ones.
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
            const target = resolveLinkTarget(
              attributes.href,
              attributes.target,
            );
            return target ? { target } : {};
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
