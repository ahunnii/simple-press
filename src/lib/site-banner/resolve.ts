/**
 * Safe, sync, no-throw resolvers for banner and popup configs.
 * Pure module — no fetch, no throw, no React.
 * Called in server components; parsed values passed as props to client components.
 */

import type { BannerConfig, PopupConfig } from "~/lib/validators/site-banner";
import {
  bannerConfigSchema,
  popupConfigSchema,
} from "~/lib/validators/site-banner";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { isContentEmpty } from "~/lib/template-fields";

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
 */
export function resolveBanner(
  siteContent: SiteContentLike,
  bannersEnabled: boolean,
): BannerConfig | null {
  if (!bannersEnabled) return null;
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

  return config;
}

/**
 * Resolves the active PopupConfig from a business's siteContent, or null if:
 * - the `popups` feature flag is off
 * - siteContent or popupConfig is missing
 * - `enabled !== true` in the stored config
 * - content is empty (text mode: no content; image mode: no imagePath)
 * - the stored JSON fails schema validation
 */
export function resolvePopup(
  siteContent: SiteContentLike,
  popupsEnabled: boolean,
): PopupConfig | null {
  if (!popupsEnabled) return null;
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

  return config;
}
