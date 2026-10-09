/**
 * Safe, sync, no-throw resolvers for banner and popup configs.
 * Pure module — no fetch, no throw, no React.
 * Called in server components; parsed values passed as props to client components.
 */

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { routeEnabled } from "~/lib/features/route-flags";
import type { BannerConfig, PopupConfig } from "~/lib/validators/site-banner";
import { isContentEmpty } from "~/lib/template-fields";
import {
  bannerConfigSchema,
  popupConfigSchema,
} from "~/lib/validators/site-banner";

type SiteContentLike =
  | { bannerConfig?: unknown; popupConfig?: unknown }
  | null
  | undefined;

/**
 * Resolves the active BannerConfig from a business's siteContent, or null if:
 * - the `banners` feature flag is off
 * - siteContent or bannerConfig is missing
 * - `enabled !== true` in the stored config
 * - content is empty (nothing to render)
 * - the stored JSON fails schema validation
 *
 * A link to a route whose feature flag is off (e.g. `/shop` with `products`
 * off) would 404, so `linkUrl`/`linkLabel` are dropped and the banner text
 * renders on its own (baseline B2.4/B2.5).
 *
 * `isEnabled` is the business's resolved flag check (`dependsOn` cascades
 * applied) — it gates both the `banners` flag and the link's route.
 */
export function resolveBanner(
  siteContent: SiteContentLike,
  isEnabled: (key: string) => boolean,
): BannerConfig | null {
  if (!isEnabled("banners")) return null;
  if (!siteContent) return null;

  const raw = siteContent.bannerConfig;
  if (raw == null) return null;

  const result = bannerConfigSchema.safeParse(raw);
  if (!result.success) return null;

  const config = result.data;
  if (!config.enabled) return null;

  // Require non-empty richtext content.
  // config.content is Record<string,unknown>|null from Zod; cast to TiptapJSON
  // which has the same runtime shape — isContentEmpty guards null internally.
  if (config.content === null) return null;
  if (isContentEmpty(config.content as TiptapJSON)) return null;

  if (config.linkUrl && !routeEnabled(config.linkUrl, isEnabled)) {
    return { ...config, linkUrl: null, linkLabel: null };
  }

  return config;
}

/**
 * Resolves the active PopupConfig from a business's siteContent, or null if:
 * - the `popups` feature flag is off
 * - siteContent or popupConfig is missing
 * - `enabled !== true` in the stored config
 * - content is empty (text mode: no content; image mode: no imagePath)
 * - the stored JSON fails schema validation
 *
 * Like the banner link, a CTA pointing at a flag-disabled route (e.g. `/shop`
 * with `products` off) would 404, so `ctaUrl`/`ctaLabel` are dropped and the
 * popup renders without its button.
 *
 * `isEnabled` is the business's resolved flag check — it gates both the
 * `popups` flag and the CTA's route.
 */
export function resolvePopup(
  siteContent: SiteContentLike,
  isEnabled: (key: string) => boolean,
): PopupConfig | null {
  if (!isEnabled("popups")) return null;
  if (!siteContent) return null;

  const raw = siteContent.popupConfig;
  if (raw == null) return null;

  const result = popupConfigSchema.safeParse(raw);
  if (!result.success) return null;

  const config = result.data;
  if (!config.enabled) return null;

  // Mode-specific content checks
  if (config.mode === "text") {
    // config.content is Record<string,unknown>|null from Zod; cast to TiptapJSON
    if (config.content === null) return null;
    if (isContentEmpty(config.content as TiptapJSON)) return null;
  } else {
    // image mode: require a non-empty imagePath
    if (!config.imagePath) return null;
  }

  if (config.ctaUrl && !routeEnabled(config.ctaUrl, isEnabled)) {
    return { ...config, ctaUrl: null, ctaLabel: null };
  }

  return config;
}
