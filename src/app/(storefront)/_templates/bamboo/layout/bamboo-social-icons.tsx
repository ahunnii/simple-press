import { cn } from "~/lib/utils";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { TwitterIcon } from "~/components/icons/twitter-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

/**
 * Shape of `business.siteContent.socialLinks` as the storefront stores it.
 * Deliberately loose (every key optional) — merchants fill in whichever
 * networks they use, and empty strings must render nothing.
 */
export type BambooSocialLinks = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
};

/**
 * Narrows the untyped `siteContent.socialLinks` JSON column into
 * `BambooSocialLinks`. Shared by the header (client) and the footer (server)
 * so both read the same field with the same fallbacks.
 */
export function readBambooSocialLinks(
  socialLinks: unknown,
): BambooSocialLinks | undefined {
  return (socialLinks as BambooSocialLinks | null | undefined) ?? undefined;
}

const NETWORKS = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "twitter", label: "X (Twitter)", Icon: TwitterIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon },
] as const;

type BambooSocialIconsProps = {
  socialLinks: BambooSocialLinks | undefined;
  /** Class list for the wrapping row. */
  className?: string;
  /** Class list for each anchor (the tinted round button / bare icon). */
  linkClassName?: string;
  /** Class list for the icon glyph itself. */
  iconClassName?: string;
  /** Accessible name for the row, e.g. "Follow us on social media". */
  label: string;
  /** Called when any profile link is clicked (e.g. to close a containing sheet). */
  onLinkClick?: () => void;
};

/**
 * Social profile links rendered as icon buttons. Presentation-only and
 * hook-free, so the same module renders inside the client header and the
 * async server footer.
 *
 * Every profile opens in a new tab, so each link carries a visually hidden
 * name plus the "(opens in new tab)" suffix rather than an `aria-label`
 * (which would swallow the suffix).
 */
export function BambooSocialIcons({
  socialLinks,
  className,
  linkClassName,
  iconClassName,
  label,
  onLinkClick,
}: BambooSocialIconsProps) {
  const entries = NETWORKS.flatMap(({ key, label: name, Icon }) => {
    const href = socialLinks?.[key]?.trim();
    return href ? [{ key, name, Icon, href }] : [];
  });

  if (entries.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-2", className)} aria-label={label}>
      {entries.map(({ key, name, Icon, href }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center transition-colors",
              linkClassName,
            )}
            onClick={onLinkClick}
          >
            <Icon className={cn("size-4", iconClassName)} />
            <span className="sr-only">{name} (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
