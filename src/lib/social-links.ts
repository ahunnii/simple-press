import type { ComponentType } from "react";

import { safeHref } from "~/lib/safe-href";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { LinkedinIcon } from "~/components/icons/linkedin-icon";
import { PinterestIcon } from "~/components/icons/pinterest-icon";
import { ThreadsIcon } from "~/components/icons/threads-icon";
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
  | "threads"
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
    key: "threads",
    label: "Threads",
    ariaLabel: "Threads",
    Icon: ThreadsIcon,
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
 *
 * Values go through `safeHref` (`~/lib/safe-href`): the column predates the
 * scheme allowlist that `socialLinksSchema` now enforces on save, so a legacy
 * row can still hold a `javascript:`/`data:` value that every template
 * renders straight into an `<a href>`. An unsafe value drops the network
 * entirely rather than rendering a dead icon.
 */
export function resolveSocialLinks(raw: unknown): ResolvedSocialLink[] {
  if (!raw || typeof raw !== "object") return [];
  const links = raw as Record<string, unknown>;
  const resolved: ResolvedSocialLink[] = [];
  for (const network of SOCIAL_NETWORKS) {
    const url = safeHref(links[network.key]);
    if (url !== null) {
      resolved.push({ ...network, url });
    }
  }
  return resolved;
}

/**
 * Key of the Google Business Profile link in `SiteContent.socialLinks`. It is
 * SEO-only: it feeds JSON-LD `sameAs` (every http value in that JSON does) but
 * is deliberately NOT in `SOCIAL_NETWORKS`, so no template, email footer, or
 * loyalty claim ever renders it as an icon.
 */
export const GOOGLE_BUSINESS_PROFILE_KEY = "googleBusinessProfile";
export const GOOGLE_BUSINESS_PROFILE_LABEL = "Google Business Profile";

/** Any `socialLinks` key an owner can fill in — the icons plus the SEO-only one. */
export type SocialLinkKey =
  | SocialNetworkKey
  | typeof GOOGLE_BUSINESS_PROFILE_KEY;

type HostRule = string | RegExp;

/** Hosts that belong to each slot. A string matches the host or any subdomain. */
const HOST_RULES: Record<SocialLinkKey, HostRule[]> = {
  instagram: ["instagram.com"],
  threads: ["threads.net", "threads.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  twitter: ["twitter.com", "x.com"],
  linkedin: ["linkedin.com", "lnkd.in"],
  tiktok: ["tiktok.com"],
  pinterest: [/(^|\.)pinterest\.[a-z.]+$/, "pin.it"],
  youtube: ["youtube.com", "youtu.be"],
  googleBusinessProfile: [/(^|\.)google\.[a-z.]+$/, "goo.gl", "g.page", "g.co"],
};

const SLOT_LABELS: Record<SocialLinkKey, string> = {
  ...Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.key, n.label])),
  googleBusinessProfile: GOOGLE_BUSINESS_PROFILE_LABEL,
} as Record<SocialLinkKey, string>;

/** Names used in the hint ("This looks like a Threads link"). */
const HINT_NAMES: Record<SocialLinkKey, string> = {
  ...SLOT_LABELS,
  twitter: "X (Twitter)",
};

/** "a Threads", "an Instagram" — hints read as sentences. */
const withArticle = (name: string) =>
  `${/^[aeiox]/i.test(name) ? "an" : "a"} ${name}`;

function hostMatches(host: string, rules: HostRule[]): boolean {
  return rules.some((rule) =>
    typeof rule === "string"
      ? host === rule || host.endsWith(`.${rule}`)
      : rule.test(host),
  );
}

function parseHost(url: string): string | null {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

/**
 * Soft check that a pasted link points at the network its box is for — e.g. a
 * Threads URL pasted into the Instagram box. Returns a friendly hint, or
 * `null` when the host matches, or the value is empty / not a parseable
 * http(s) URL (the form's own validation reports those). Never blocking: the
 * owner may have a legitimate vanity or short domain.
 */
export function socialHostMismatch(
  key: SocialLinkKey,
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const host = parseHost(url);
  if (!host) return null;
  if (hostMatches(host, HOST_RULES[key])) return null;

  const other = (Object.keys(HOST_RULES) as SocialLinkKey[]).find(
    (k) => k !== key && hostMatches(host, HOST_RULES[k]),
  );
  return other
    ? `This looks like ${withArticle(HINT_NAMES[other])} link, not ${HINT_NAMES[key]}.`
    : `This doesn't look like ${withArticle(HINT_NAMES[key])} link.`;
}
