import { resolveSocialLinks } from "~/lib/social-links";

type PinkSocialLinksProps = {
  /** Raw `business.siteContent.socialLinks` JSON — parsed via the registry. */
  socialLinks: unknown;
  /**
   * Must follow the HOST SURFACE's tone, never a literal — the footer is dark
   * on most routes but light on `/about` and `/blog/[slug]`, so callers pass
   * their own resolved tone through. `dark` uses `--pink-blush` (the
   * dark-surface-only accent) and `light` uses `--pink-rose`; swapping them
   * produces ~1.2:1 text, which is how the 2026-07-31 remediation regressed.
   */
  tone?: "light" | "dark";
  className?: string;
};

/**
 * Pink's bordered square icon links for `SiteContent.socialLinks` — the
 * platform-wide social registry (`~/lib/social-links`) already read by
 * `elegant`/`pollen`/`builders`/`happy-bamboo`. Renders nothing when the
 * owner hasn't set any social URLs, so callers never need to guard an empty
 * heading or a dangling grid cell around it.
 */
export function PinkSocialLinks({
  socialLinks,
  tone = "light",
  className,
}: PinkSocialLinksProps) {
  const links = resolveSocialLinks(socialLinks);
  if (links.length === 0) return null;

  const isDark = tone === "dark";
  const boxClasses = isDark
    ? "border-[var(--pink-ink-line-strong)] text-[var(--pink-ink-body)] hover:border-[var(--pink-blush)] hover:text-[var(--pink-blush)]"
    : "border-[var(--pink-line-button)] text-[var(--pink-ink)] hover:border-[var(--pink-rose)] hover:text-[var(--pink-rose)]";

  return (
    <div
      className={`flex flex-wrap gap-2.5${className ? ` ${className}` : ""}`}
    >
      {links.map(({ key, url, ariaLabel, Icon }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex h-10 w-10 items-center justify-center border transition-colors [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${boxClasses}`}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">{ariaLabel} (opens in new tab)</span>
        </a>
      ))}
    </div>
  );
}
