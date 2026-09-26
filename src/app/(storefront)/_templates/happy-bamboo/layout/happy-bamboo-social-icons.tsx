import type { ResolvedSocialLink } from "~/lib/social-links";
import { resolveSocialLinks } from "~/lib/social-links";
import { cn } from "~/lib/utils";

/**
 * Narrows the untyped `siteContent.socialLinks` JSON column into the
 * platform-wide social-links registry (`~/lib/social-links`, the same
 * `SiteContent.socialLinks` column read by every template). Shared by the
 * footer (server), mobile nav (client), and about page (client) so all three
 * read the same field with the same safe-href fallbacks and the same
 * network list — previously each spot kept its own hand-rolled per-network
 * block, which meant a LinkedIn/Pinterest/YouTube URL saved in
 * Content → Branding never rendered, and an empty-string value (rather than
 * a missing key) didn't hide the network either.
 */
export function readHappyBambooSocialLinks(
  socialLinks: unknown,
): ResolvedSocialLink[] {
  return resolveSocialLinks(socialLinks);
}

/**
 * True when `HappyBambooSocialIcons` would render at least one link. Lets a
 * caller decide whether to render chrome that only makes sense beside the
 * row (e.g. an entire "Follow us" card).
 */
export function hasHappyBambooSocialLinks(
  socialLinks: ResolvedSocialLink[],
): boolean {
  return socialLinks.length > 0;
}

type HappyBambooSocialIconsProps = {
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
 * hook-free, so the same module renders inside the client mobile nav /
 * about page and the async server footer.
 *
 * Every profile opens in a new tab, so each link carries a visually hidden
 * name plus the "(opens in new tab)" suffix rather than an `aria-label`
 * (which would swallow the suffix).
 */
export function HappyBambooSocialIcons({
  socialLinks,
  className,
  linkClassName,
  iconClassName,
  label,
  onLinkClick,
}: HappyBambooSocialIconsProps) {
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
