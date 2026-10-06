import type { TemplateField, TemplatePage } from "~/lib/template-fields";

import { nonBlank } from "./umsc-non-blank";

/**
 * Optional photo for an interior page's black band (`UmscPageHero`) — three
 * looks per page, picked by the owner:
 *
 * - no photo → the plain black band (the default);
 * - photo, switch off → the photo beside the heading on wide screens
 *   (hidden below `lg`), as About has always done;
 * - photo, switch on → the photo fills the band behind the text under a dark
 *   scrim, on every width.
 *
 * Keys are `umsc.<page>.hero-image`, `-image-alt` and `-image-behind`, in the
 * page's existing hero group. Pages that already own a photo field (About's
 * pre-existing pair, Services' inherited `default.services.hero-image`) take
 * only the switch via `withImage: false`.
 *
 * Dependency-free on purpose (type imports + the one-line `nonBlank`): the
 * per-page field modules import this, and `umsc/index.ts` imports them —
 * anything heavier here risks the registry's circular-import trap.
 */

export type UmscHeroImageMode = "side" | "background";

export function umscHeroPhotoFields(
  page: TemplatePage,
  group: string,
  opts: { withImage?: boolean } = {},
): TemplateField[] {
  const { withImage = true } = opts;

  const behind: TemplateField = {
    key: `umsc.${page}.hero-image-behind`,
    label: "Show the photo behind the heading",
    description:
      "With no photo the band at the top of the page stays plain and dark. With a photo and this off, the photo sits beside the heading on wide screens (hidden on phones). Turn it on to fill the whole band with the photo behind the text, under a dark overlay that keeps the words readable — on phones too.",
    type: "boolean",
    page,
    group,
    gridColumn: "col-span-full",
    defaultValue: "false",
  };

  if (!withImage) return [behind];

  return [
    {
      key: `umsc.${page}.hero-image`,
      label: "Photo",
      description:
        "Optional photo for the band at the top of the page. Leave blank for a plain dark band. Where it shows is set by Show the photo behind the heading.",
      type: "image",
      page,
      group,
      gridColumn: "col-span-1",
      defaultValue: "",
    },
    {
      key: `umsc.${page}.hero-image-alt`,
      label: "Photo alt text",
      description:
        "Describes the photo for screen readers. Leave blank if the photo is purely decorative.",
      type: "text",
      page,
      group,
      gridColumn: "col-span-1",
      defaultValue: "",
    },
    behind,
  ];
}

/**
 * Reads the three keys above out of a resolved field record into
 * `UmscPageHero`'s `image` / `imageAlt` / `imageMode` props. Booleans are
 * stored as the strings "true" / "false"; anything but "true" (including an
 * unsaved field) is the side layout. `imageKeyOverride` points the photo at
 * an inherited key (Services' `default.services.hero-image`).
 */
export function resolveUmscHeroPhoto(
  f: Record<string, string | undefined>,
  page: string,
  imageKeyOverride?: string,
): { image?: string; imageAlt: string; imageMode: UmscHeroImageMode } {
  return {
    image: nonBlank(f[imageKeyOverride ?? `umsc.${page}.hero-image`]),
    imageAlt: f[`umsc.${page}.hero-image-alt`]?.trim() ?? "",
    imageMode:
      f[`umsc.${page}.hero-image-behind`]?.trim() === "true"
        ? "background"
        : "side",
  };
}
