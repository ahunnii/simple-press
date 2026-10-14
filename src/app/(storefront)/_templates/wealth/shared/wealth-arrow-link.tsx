import Link from "next/link";

import { cn } from "~/lib/utils";

type WealthArrowLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** New tab. Defaults to true for http(s) hrefs. */
  external?: boolean;
} & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className" | "children"
>;

/**
 * Mono caps text link with a trailing "»" and a currentColor underline
 * ("OUR PROGRAMS »", "ALL NEWS »"). Color follows the block's link color
 * (sage on forest, white on primary, primary on paper/surface). Extra
 * attributes (e.g. `fieldAttr(...)`) land on the anchor.
 */
export function WealthArrowLink({
  href,
  children,
  className,
  external,
  ...rest
}: WealthArrowLinkProps) {
  const opensNewTab = external ?? /^https?:\/\//i.test(href);
  return (
    <Link
      {...rest}
      href={href}
      className={cn("wealth-arrow-link", className)}
      {...(opensNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {opensNewTab ? (
        <span className="sr-only"> (opens in new tab)</span>
      ) : null}
    </Link>
  );
}
