import type { ComponentType } from "react";

import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { LinkedinIcon } from "~/components/icons/linkedin-icon";
import { PinterestIcon } from "~/components/icons/pinterest-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { TwitterIcon } from "~/components/icons/twitter-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

/**
 * Shared registry for `SiteContent.socialLinks` (`prisma/schema.prisma`) —
 * the JSON column written by Admin → Branding (`branding-editor.tsx`) and
 * already read by the `elegant`, `pollen`, `builders`, and `happy-bamboo`
 * templates. Centralizes the label/icon per network so templates don't each
 * repeat the same ~25-line block per network inline (see
 * `elegant-footer.tsx`'s pre-existing per-network JSX for what that looked
 * like before this module existed).
 *
 * Deliberately presentation-agnostic: no colors, sizes, or template tokens
 * here — just data + icon components. Templates own how the result is
 * styled and laid out.
 */

export type SocialNetworkKey =
  | "instagram"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "pinterest"
  | "youtube";

/** The shape of the raw `SiteContent.socialLinks` JSON column. */
export type SocialLinks = Partial<Record<SocialNetworkKey, string>>;

export interface SocialNetworkDef {
  key: SocialNetworkKey;
  /** Visible label, e.g. for admin UI or text-based renderings. */
  label: string;
  /** Accessible name for an icon-only link, e.g. "Instagram". */
  ariaLabel: string;
  Icon: ComponentType<{ className?: string }>;
}

export interface ResolvedSocialLink extends SocialNetworkDef {
  url: string;
}

/**
 * Canonical order — mirrors Admin → Branding
 * (`src/app/admin/content/branding/_components/branding-editor.tsx`).
 */
export const SOCIAL_NETWORKS: SocialNetworkDef[] = [
  {
    key: "instagram",
    label: "Instagram",
    ariaLabel: "Instagram",
    Icon: InstagramIcon,
  },
  {
    key: "facebook",
    label: "Facebook",
    ariaLabel: "Facebook",
    Icon: FacebookIcon,
  },
  {
    key: "twitter",
    label: "X / Twitter",
    ariaLabel: "X / Twitter",
    Icon: TwitterIcon,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    ariaLabel: "LinkedIn",
    Icon: LinkedinIcon,
  },
  {
    key: "tiktok",
    label: "TikTok",
    ariaLabel: "TikTok",
    Icon: TikTokIcon,
  },
  {
    key: "pinterest",
    label: "Pinterest",
    ariaLabel: "Pinterest",
    Icon: PinterestIcon,
  },
  {
    key: "youtube",
    label: "YouTube",
    ariaLabel: "YouTube",
    Icon: YouTubeIcon,
  },
];

/**
 * Parses the raw `SiteContent.socialLinks` JSON and returns only the
 * networks the owner has actually filled in, in canonical order. Safe
 * against `null`/`undefined`/malformed JSON — always returns an array.
 */
export function resolveSocialLinks(raw: unknown): ResolvedSocialLink[] {
  if (!raw || typeof raw !== "object") return [];
  const links = raw as Record<string, unknown>;
  const resolved: ResolvedSocialLink[] = [];
  for (const network of SOCIAL_NETWORKS) {
    const url = links[network.key];
    if (typeof url === "string" && url.trim().length > 0) {
      resolved.push({ ...network, url: url.trim() });
    }
  }
  return resolved;
}
