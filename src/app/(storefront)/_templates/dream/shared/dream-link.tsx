import Link from "next/link";

import { cn } from "~/lib/utils";

type DreamLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
};

/**
 * The site's primary inline-link treatment: rose 1px underline that slides
 * in on hover (design.md "Chrome › Header", "Motion › Hover"). Renders a
 * real `<a>` for external/mailto/tel targets and a Next `Link` for internal
 * routes.
 */
export function DreamLink({
  href,
  children,
  className,
  external,
}: DreamLinkProps) {
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
        className={cn("dream-link", className)}
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
    <Link href={href} className={cn("dream-link", className)}>
      {children}
    </Link>
  );
}
