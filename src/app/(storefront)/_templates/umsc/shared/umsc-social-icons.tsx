import type { UmscSocialLink } from "./umsc-contact-details";
import { SOCIAL_NETWORKS } from "~/lib/social-links";
import { cn } from "~/lib/utils";

type Props = {
  /** From `resolveUmscContactDetails(...).socials`. */
  links: UmscSocialLink[];
  /** Row wrapper classes (gap, margin). */
  className?: string;
  /** Classes for each icon-only link (hit area, colour, hover). */
  linkClassName?: string;
};

/**
 * Icon-only social row for the footer "Follow" column and the contact
 * aside. Renders every network Content → Branding resolves (plus legacy
 * fallbacks — see `resolveUmscContactDetails`), with icons from the shared
 * `SOCIAL_NETWORKS` registry. Renders nothing for an empty list. No
 * "use client": safe to render from both server and client parents, since
 * `links` is plain data and the icon is looked up here.
 */
export function UmscSocialIcons({ links, className, linkClassName }: Props) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex gap-4", className)}>
      {links.map(({ key, url, ariaLabel }) => {
        const Icon = SOCIAL_NETWORKS.find((n) => n.key === key)?.Icon;
        if (!Icon) return null;
        return (
          <a
            key={key}
            href={url}
            aria-label={ariaLabel}
            className={linkClassName}
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}
