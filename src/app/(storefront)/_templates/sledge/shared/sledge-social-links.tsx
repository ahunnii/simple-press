import { resolveSocialLinks } from "~/lib/social-links";
import { cn } from "~/lib/utils";

/**
 * True when `SledgeSocialLinks` would render at least one profile link, so a
 * caller can skip the chrome around the row.
 */
export function hasSledgeSocialLinks(socialLinks: unknown): boolean {
  return resolveSocialLinks(socialLinks).length > 0;
}

type Props = {
  /** The raw `siteContent.socialLinks` JSON (Content → Branding). */
  socialLinks: unknown;
  /** Class list for the wrapping row. */
  className?: string;
  /** Accessible name for the row, e.g. "Follow us on social media". */
  label?: string;
};

/**
 * Icon links to the owner's social profiles, built on the platform registry
 * (`~/lib/social-links`) so every network saved in Content → Branding
 * renders (URLs pass through `safeHref` there) — instagram, facebook,
 * twitter/X, linkedin, tiktok, pinterest, and youtube, not just the four
 * sledge used to hand-roll. Shared by the footer (server) and the homepage
 * subscribe block (client) so both read the same field with the same
 * fallbacks and the same network list.
 *
 * Every profile opens in a new tab, so the link text is a visually hidden
 * network name plus "(opens in new tab)" rather than an `aria-label` (which
 * would swallow the suffix).
 */
export function SledgeSocialLinks({
  socialLinks,
  className,
  label = "Follow us on social media",
}: Props) {
  const links = resolveSocialLinks(socialLinks);
  if (links.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap items-start gap-3", className)}
      aria-label={label}
    >
      {links.map(({ key, ariaLabel, Icon, url }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="sl-social-btn inline-flex items-center justify-center transition-opacity hover:opacity-70"
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{ariaLabel} (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
