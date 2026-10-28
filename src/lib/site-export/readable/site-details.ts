/** "Site details.html" — everything about the business that isn't a page. */
import type { RenderCtx, SiteDetailsInput } from "./types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { parsePageMeta, STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";

import { callout, esc, fieldTable } from "../html";
import { SITE_DETAILS_PATH } from "../types";
import {
  formatMoney,
  humanize,
  imgHtml,
  inlineText,
  linkHtml,
  photosGridHtml,
  richTextHtml,
  shell,
  tableHtml,
  yesNo,
} from "./shared";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  threads: "Threads",
  facebook: "Facebook",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  youtube: "YouTube",
  googleBusinessProfile: "Google Business Profile",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

interface NavItem {
  label: string;
  href: string;
  external: boolean;
  children: NavItem[];
}

export function parseNavItems(raw: unknown): NavItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((item) => ({
    label: str(item.label),
    href: str(item.href),
    external: item.external === true,
    children: parseNavItems(item.children),
  }));
}

function navHref(ctx: RenderCtx, item: NavItem): string {
  if (!item.href) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(item.href)) return linkHtml(item.href);
  const abs = item.href.startsWith("/")
    ? `${ctx.business.siteUrl}${item.href}`
    : item.href;
  return `${linkHtml(abs, item.href)}`;
}

function navListHtml(items: NavItem[], ctx: RenderCtx): string {
  const visible = items.filter((i) => i.label || i.href);
  if (visible.length === 0) return "";
  return `<ul>${visible
    .map(
      (i) =>
        `<li><strong>${esc(i.label || "(no label)")}</strong>${i.href ? ` — ${navHref(ctx, i)}` : ""}${i.children.length > 0 ? navListHtml(i.children, ctx) : ""}</li>`,
    )
    .join("")}</ul>`;
}

function swatch(hex: string | null | undefined): string {
  const c = hex?.trim() ?? "";
  if (!/^#[0-9a-f]{3,8}$/i.test(c)) return c ? esc(c) : "";
  return `<span style="display:inline-block;width:14px;height:14px;border:1px solid #999;vertical-align:middle;background:${esc(c)}"></span> <code>${esc(c)}</code>`;
}

function block(title: string, body: string): string {
  return body ? `<h2>${esc(title)}</h2>${body}` : "";
}

function bannerHtml(raw: unknown, ctx: RenderCtx): string {
  if (!isRecord(raw)) return "";
  const text = richTextHtml(ctx, SITE_DETAILS_PATH, raw.content).html;
  const table = fieldTable([
    [
      "Switched on",
      raw.enabled === true ? yesNo(true) : "No (saved but not showing)",
    ],
    ["Text", text],
    [
      "Link",
      str(raw.linkUrl)
        ? linkHtml(str(raw.linkUrl), str(raw.linkLabel) || str(raw.linkUrl))
        : "",
    ],
    ["Background color", swatch(str(raw.bgColor))],
    ["Text color", swatch(str(raw.textColor))],
  ]);
  return text || str(raw.linkUrl) ? table : "";
}

function popupHtml(raw: unknown, ctx: RenderCtx): string {
  if (!isRecord(raw)) return "";
  const text = richTextHtml(ctx, SITE_DETAILS_PATH, raw.content).html;
  const heading = str(raw.heading);
  const image = str(raw.imagePath);
  if (!text && !heading && !image) return "";
  return fieldTable([
    [
      "Switched on",
      raw.enabled === true ? yesNo(true) : "No (saved but not showing)",
    ],
    ["Style", raw.mode === "image" ? "Picture only" : "Text"],
    ["Heading", inlineText(heading)],
    ["Text", text],
    [
      "Picture",
      image
        ? imgHtml(ctx, SITE_DETAILS_PATH, image, str(raw.imageAlt), 280)
        : "",
    ],
    [
      "Button",
      str(raw.ctaUrl)
        ? linkHtml(str(raw.ctaUrl), str(raw.ctaLabel) || str(raw.ctaUrl))
        : "",
    ],
  ]);
}

function seoPerPage(raw: unknown, ctx: RenderCtx): string {
  const meta = parsePageMeta(raw);
  const rows = STATIC_SEO_ROUTES.filter((r) => meta[r.key]).map((r) => {
    const m = meta[r.key]!;
    return [
      esc(r.label),
      esc(m.title ?? ""),
      esc(m.description ?? ""),
      m.ogImage ? imgHtml(ctx, SITE_DETAILS_PATH, m.ogImage, "", 96) : "",
    ];
  });
  return tableHtml(
    ["Page", "Search title", "Search description", "Share image"],
    rows,
  );
}

export function renderSiteDetailsDoc(
  d: SiteDetailsInput,
  ctx: RenderCtx,
): string {
  const sc = d.siteContent;
  const docPath = SITE_DETAILS_PATH;

  const about = fieldTable([
    ["Business name", esc(d.name)],
    ["Contact email shown to customers", esc(d.supportEmail ?? "")],
    ["Account (owner) email", esc(d.ownerEmail ?? "")],
    ["Phone", esc(d.phoneNumber ?? "")],
    ["Address", inlineText(d.businessAddress)],
    [
      "Map pin (latitude, longitude)",
      d.latitude !== null && d.longitude !== null
        ? `${esc(d.latitude)}, ${esc(d.longitude)}`
        : "",
    ],
    ["Areas served", d.areaServed.map(esc).join(", ")],
    ["Time zone", esc(d.timeZone)],
    ["Website address", linkHtml(ctx.business.siteUrl)],
    ["Design template", esc(d.templateLabel)],
  ]);

  const hours = formatBusinessHours(parseBusinessHours(d.businessHours));
  const hoursHtml = tableHtml(
    ["Days", "Hours"],
    hours.map((h) => [esc(h.label), esc(h.value)]),
  );

  const pickup = d.offersInStorePickup
    ? fieldTable([
        ["Pickup location", inlineText(d.pickupLocation)],
        ["Pickup hours and instructions", inlineText(d.pickupInstructions)],
      ])
    : "";

  const deliveryZip = d.localDeliveryOriginZip ?? d.addressPostalCode;
  const localDelivery = d.offersLocalDelivery
    ? fieldTable([
        [
          "Delivering from ZIP code",
          deliveryZip
            ? esc(deliveryZip) +
              (d.localDeliveryOriginZip ? "" : " (your business address)")
            : "",
        ],
        [
          "Delivery radius",
          d.localDeliveryRadiusMiles !== null
            ? `${esc(d.localDeliveryRadiusMiles)} miles`
            : "",
        ],
        [
          d.localDeliveryBands.length > 0
            ? "Delivery fee (farthest ring)"
            : "Delivery fee",
          d.localDeliveryFeeCents > 0
            ? esc(formatMoney(d.localDeliveryFeeCents))
            : "Free",
        ],
        [
          "Closer prices",
          d.localDeliveryBands
            .map(
              (b) =>
                `${b.feeCents > 0 ? esc(formatMoney(b.feeCents)) : "Free"} within ${esc(b.upToMiles)} ${b.upToMiles === 1 ? "mile" : "miles"}`,
            )
            .join("; "),
        ],
        [
          "Minimum order",
          d.localDeliveryMinOrderCents !== null &&
          d.localDeliveryMinOrderCents > 0
            ? esc(formatMoney(d.localDeliveryMinOrderCents))
            : "",
        ],
        [
          "Delivery days and instructions",
          inlineText(d.localDeliveryInstructions),
        ],
      ])
    : "";

  const social = isRecord(sc?.socialLinks)
    ? fieldTable(
        Object.entries(sc.socialLinks)
          .filter(([, v]) => str(v))
          .map(([k, v]): [string, string] => [
            SOCIAL_LABELS[k] ?? humanize(k),
            linkHtml(str(v)),
          ]),
      )
    : "";

  const nav = navListHtml(parseNavItems(sc?.navigationItems), ctx);
  const footerItems = parseNavItems(sc?.footerNavigationItems);
  const footerNav = navListHtml(footerItems, ctx);

  const logos = [
    sc?.logoUrl
      ? `<h3>Logo</h3>${photosGridHtml(ctx, docPath, [{ url: sc.logoUrl, alt: sc.logoAltText ?? d.name }])}`
      : "",
    sc?.faviconUrl
      ? `<h3>Favicon (browser tab icon)</h3>${photosGridHtml(ctx, docPath, [{ url: sc.faviconUrl, alt: "Favicon" }])}`
      : "",
    sc?.logoAltText
      ? fieldTable([["Logo description (alt text)", esc(sc.logoAltText)]])
      : "",
  ].join("");

  const colors = fieldTable([
    ["Primary color", swatch(sc?.primaryColor)],
    ["Secondary color", swatch(sc?.secondaryColor)],
    ["Accent color", swatch(sc?.accentColor)],
    [
      "Color palette chosen in the editor",
      d.theme.paletteLabel
        ? `${esc(d.theme.paletteLabel)} ${d.theme.paletteColors.map(swatch).join(" ")}`
        : "",
    ],
    ["Font pairing chosen in the editor", esc(d.theme.fontsLabel ?? "")],
  ]);
  const colorsNote = colors
    ? callout(
        "Your design template sets its own fonts and colors. Use these as a guide when you pick a theme on your new site. See the style guide, if CGJ supplied one, for the full look.",
        "tip",
      )
    : "";

  const seoSite = fieldTable([
    ["Site title", inlineText(sc?.metaTitle)],
    ["Site description", inlineText(sc?.metaDescription)],
    ["Keywords", inlineText(sc?.metaKeywords)],
    ["Short brand name (page title ending)", esc(sc?.seoBrandName ?? "")],
    [
      "Default share image",
      sc?.ogImage ? imgHtml(ctx, docPath, sc.ogImage, "", 280) : "",
    ],
  ]);
  const seoPages = seoPerPage(sc?.pageMeta, ctx);

  const legacy = fieldTable([
    ["Hero title", inlineText(sc?.heroTitle)],
    ["Hero subtitle", inlineText(sc?.heroSubtitle)],
    [
      "Hero button",
      sc?.heroButtonText
        ? esc(sc.heroButtonText) +
          (sc.heroButtonLink ? ` → ${linkHtml(sc.heroButtonLink)}` : "")
        : "",
    ],
    [
      "Hero image",
      sc?.heroImageUrl ? imgHtml(ctx, docPath, sc.heroImageUrl, "", 280) : "",
    ],
    ["About title", inlineText(sc?.aboutTitle)],
    ["About text", inlineText(sc?.aboutText)],
    [
      "About image",
      sc?.aboutImageUrl ? imgHtml(ctx, docPath, sc.aboutImageUrl, "", 280) : "",
    ],
  ]);

  const domain = [
    fieldTable([
      ["Your own domain", esc(d.customDomain ?? "")],
      ["Domain status", d.customDomain ? esc(d.domainStatus ?? "") : ""],
      ["Address on SimplePress", linkHtml(ctx.business.siteUrl)],
    ]),
    callout(
      d.customDomain
        ? `<strong>Keeping your domain:</strong> ${esc(d.customDomain)} belongs to you. To keep using it, point it at your new host (the host will give you the exact records to set). Step-by-step instructions are in the guides linked from START HERE.`
        : `<strong>Domain:</strong> your site currently lives at the SimplePress address above. If you buy your own domain for your new site, the guides linked from START HERE explain how to point it at your new host.`,
      "info",
    ),
  ].join("");

  const body = [
    block("Business", about),
    block("Opening hours", hoursHtml),
    block("Pickup", pickup),
    block("Local delivery", localDelivery),
    block("Social media", social),
    block("Main menu", nav),
    block(
      "Footer links",
      footerNav ||
        (nav
          ? `<p class="muted">No separate footer links are set; your footer shows the main menu links.</p>`
          : ""),
    ),
    block("Footer text", sc?.footerText ? `<p>${esc(sc.footerText)}</p>` : ""),
    block("Logo and icon", logos),
    block("Colors and fonts", colorsNote + colors),
    block("Announcement banner", bannerHtml(sc?.bannerConfig, ctx)),
    block("Pop-up", popupHtml(sc?.popupConfig, ctx)),
    block("Search engine details (SEO)", seoSite + seoPages),
    block("Older homepage content", legacy),
    block("Domain", domain),
  ].join("");

  return shell(ctx, {
    docPath,
    title: "Site details",
    subtitle: d.name,
    bodyHtml: body,
  });
}
