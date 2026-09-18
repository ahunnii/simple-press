import { resolveSocialLinks } from "~/lib/social-links";
import { cn } from "~/lib/utils";

type DreamSocialLinksProps = {
  /** Raw `business.siteContent.socialLinks` JSON — parsed via the registry. */
  socialLinks: unknown;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Reads the platform-wide Branding social links (the registry in
 * `~/lib/social-links`, the same `SiteContent.socialLinks` column read by
 * `elegant`/`pollen`/`builders`/`happy-bamboo`/`pink`) and renders a row of
 * icon-only links. Renders nothing when the owner hasn't set any social
 * URLs, so callers never need to guard an empty row. Used by the footer and
 * the mobile nav overlay.
 */
export function DreamSocialLinks({
  socialLinks,
  className,
  style,
}: DreamSocialLinksProps) {
  const links = resolveSocialLinks(socialLinks);
  if (links.length === 0) return null;

  return (
    <ul
      className={cn("dream-social-links", className)}
      style={style}
      aria-label="Social media"
    >
      {links.map(({ key, url, ariaLabel, Icon }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="dream-social-link"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{ariaLabel} (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
