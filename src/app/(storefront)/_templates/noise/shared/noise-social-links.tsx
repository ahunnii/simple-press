import type { CSSProperties } from "react";

import { resolveSocialLinks } from "~/lib/social-links";
import { cn } from "~/lib/utils";

/**
 * True when `NoiseSocialLinks` would render at least one profile link, so a
 * caller can skip the chrome around the row.
 */
export function hasNoiseSocialLinks(socialLinks: unknown): boolean {
  return resolveSocialLinks(socialLinks).length > 0;
}

type Props = {
  /**
   * The raw `siteContent.socialLinks` JSON (Content → Branding). Resolved
   * here rather than by the caller because the resolved entries carry icon
   * components, which can't cross the server → client prop boundary.
   */
  socialLinks: unknown;
  /** Class list for the wrapping row. */
  className?: string;
  /** Class list for each anchor. */
  linkClassName?: string;
  /** Inline styles for each anchor. */
  linkStyle?: CSSProperties;
  /** Class list for the icon glyph. */
  iconClassName?: string;
  /** Accessible name for the row, e.g. "Follow us on social media". */
  label?: string;
};

/**
 * Icon links to the owner's social profiles, built on the platform registry
 * (`~/lib/social-links`) so every network saved in Content → Branding renders
 * (URLs pass through `safeHref` there). Mirrors
 * `vii/shared/vii-social-links.tsx` styled for noise's footer.
 *
 * Each profile opens in a new tab, so the link text is a visually hidden
 * network name plus "(opens in new tab)" rather than an `aria-label` (which
 * would swallow the suffix).
 */
export function NoiseSocialLinks({
  socialLinks,
  className,
  linkClassName,
  linkStyle,
  iconClassName,
  label = "Follow us on social media",
}: Props) {
  const links = resolveSocialLinks(socialLinks);
  if (links.length === 0) return null;

  return (
    <ul className={cn("flex gap-4", className)} aria-label={label}>
      {links.map(({ key, ariaLabel, Icon, url }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "-m-3 flex items-center justify-center p-3 transition-opacity hover:opacity-60",
              linkClassName,
            )}
            style={{ color: "var(--vn-steel-mist)", ...linkStyle }}
          >
            <Icon className={cn("h-3.5 w-3.5", iconClassName)} />
            <span className="sr-only">{ariaLabel} (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
