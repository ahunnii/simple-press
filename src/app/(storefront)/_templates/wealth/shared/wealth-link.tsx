import Link from "next/link";

import { cn } from "~/lib/utils";

type WealthLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
};

/**
 * The site's primary link treatment: sage border-bottom underline, no
 * `text-decoration`. Renders a real `<a>` for external/mailto/tel targets
 * and a Next `Link` for internal routes.
 */
export function WealthLink({
  href,
  children,
  className,
  external,
}: WealthLinkProps) {
  const isExternal =
    external ??
    (/^https?:\/\//i.test(href) ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:"));

  if (isExternal) {
    const opensNewTab = /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        className={cn("wealth-link", className)}
        target={opensNewTab ? "_blank" : undefined}
        rel={opensNewTab ? "noopener noreferrer" : undefined}
      >
        {children}
        {opensNewTab ? (
          <span className="sr-only"> (opens in new tab)</span>
        ) : null}
      </a>
    );
  }

  return (
    <Link href={href} className={cn("wealth-link", className)}>
      {children}
    </Link>
  );
}
