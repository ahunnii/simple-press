import type { UmscSocialLink } from "./umsc-contact-details";
import { SOCIAL_NETWORKS } from "~/lib/social-links";
import { cn } from "~/lib/utils";

type Props = {
  /** From `resolveUmscContactDetails(...).socials`. */
  links: UmscSocialLink[];
  /** Row wrapper classes (gap, margin). */
  className?: string;
  /** Classes for each link (hit area, colour, hover). */
  linkClassName?: string;
  /** Classes for each icon. Defaults to `size-4`. */
  iconClassName?: string;
  /**
   * Classes for a span wrapped around each icon (e.g. a bordered circle).
   * When omitted the icon renders unwrapped.
   */
  iconWrapClassName?: string;
  /** Render the network name beneath/beside each icon. Off by default. */
  showLabel?: boolean;
  /** Classes for the visible network name (only used with `showLabel`). */
  labelClassName?: string;
};

/**
 * Social row: icon-only by default (footer "Follow" column, contact aside),
 * or large icons with visible network names via `showLabel` (contact "Follow"
 * band). Renders every network Content → Branding resolves (plus legacy
 * fallbacks — see `resolveUmscContactDetails`), with icons from the shared
 * `SOCIAL_NETWORKS` registry. Renders nothing for an empty list. No
 * "use client": safe to render from both server and client parents, since
 * `links` is plain data and the icon is looked up here.
 */
export function UmscSocialIcons({
  links,
  className,
  linkClassName,
  iconClassName = "size-4",
  iconWrapClassName,
  showLabel = false,
  labelClassName,
}: Props) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex gap-4", className)}>
      {links.map(({ key, url, ariaLabel }) => {
        const network = SOCIAL_NETWORKS.find((n) => n.key === key);
        if (!network) return null;
        const icon = (
          <network.Icon
            className={iconClassName}
            {...(showLabel ? { "aria-hidden": true } : {})}
          />
        );
        return (
          <a
            key={key}
            href={url}
            aria-label={ariaLabel}
            className={linkClassName}
          >
            {iconWrapClassName ? (
              <span className={iconWrapClassName}>{icon}</span>
            ) : (
              icon
            )}
            {showLabel && (
              <span className={labelClassName} aria-hidden="true">
                {network.label}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
