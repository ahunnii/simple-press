import type { ResolvedSocialLink } from "~/lib/social-links";
import { resolveSocialLinks } from "~/lib/social-links";
import { cn } from "~/lib/utils";

/**
 * Narrows the untyped `siteContent.socialLinks` JSON column into the
 * platform-wide social-links registry (`~/lib/social-links`, the same
 * `SiteContent.socialLinks` column read by
 * `elegant`/`pollen`/`builders`/`happy-bamboo`/`pink`/`dream`). Shared by the
 * header (client), mobile nav (client), and footer (server) so all three
 * read the same field with the same fallbacks and the same network list —
 * previously bamboo kept its own 5-network table here, which meant a
 * LinkedIn or Pinterest URL saved in Content → Branding never rendered.
 */
export function readBambooSocialLinks(
  socialLinks: unknown,
): ResolvedSocialLink[] {
  return resolveSocialLinks(socialLinks);
}

/**
 * True when `BambooSocialIcons` would render at least one link. Lets a
 * caller render chrome that only makes sense beside the row (a divider).
 */
export function hasBambooSocialLinks(
  socialLinks: ResolvedSocialLink[],
): boolean {
  return socialLinks.length > 0;
}

type BambooSocialIconsProps = {
  socialLinks: ResolvedSocialLink[];
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
  if (socialLinks.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-2", className)} aria-label={label}>
      {socialLinks.map(({ key, ariaLabel, Icon, url }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center transition-colors",
              linkClassName,
            )}
            onClick={onLinkClick}
          >
            <Icon className={cn("size-4", iconClassName)} />
            <span className="sr-only">{ariaLabel} (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
