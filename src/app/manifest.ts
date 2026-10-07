import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { businessHostFilter } from "~/lib/domain-utils";
import { resolveSeoBrand } from "~/lib/seo/title";
import { iconVersion, resolveIconSource } from "~/lib/site-icons/source";
import { db } from "~/server/db";

const WHITE = "#ffffff";
const SHORT_NAME_MAX = 12;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Web app manifest for the requesting host. Supplies the Android home-screen
 * icon and name; icons are the generated set from `/site-icon/*`.
 *
 * `theme_color` lives ONLY here — deliberately no `<meta name="theme-color">`
 * on pages. `primaryColor` DB-defaults to #000000 and most templates never use
 * it, so a page-level meta would make Safari tint every untouched store's
 * toolbar black. Here it only tints the Android splash screen / install UI.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(host),
      status: "active",
    },
    select: {
      name: true,
      siteContent: {
        select: {
          seoBrandName: true,
          faviconUrl: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
    },
  });

  const v = iconVersion(
    business ? resolveIconSource(business.siteContent) : null,
  );

  const primaryColor = business?.siteContent?.primaryColor?.trim();
  const themeColor =
    primaryColor !== undefined && HEX_COLOR.test(primaryColor)
      ? primaryColor
      : WHITE;

  return {
    name: business?.name ?? "SimplePress",
    short_name: business
      ? resolveSeoBrand(business).trim().slice(0, SHORT_NAME_MAX).trim()
      : "SimplePress",
    start_url: "/",
    // A storefront shouldn't lose its browser chrome or back button.
    display: "browser",
    background_color: WHITE,
    theme_color: themeColor,
    icons: [
      {
        src: `/site-icon/icon-192.png?v=${v}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/site-icon/icon-512.png?v=${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/site-icon/icon-maskable-512.png?v=${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
