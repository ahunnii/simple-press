import type { ReactNode } from "react";
import Link from "next/link";

import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

const LINK_CLASS =
  "text-[var(--glove-primary)] underline decoration-1 underline-offset-4 transition-colors hover:text-[var(--glove-primary-hover)]";

/** Only same-site paths, https links, mailto and tel are ever linked. */
function isSafeHref(href: string): boolean {
  if (href.startsWith("//")) return false;
  return (
    href.startsWith("/") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

/**
 * Renders owner text containing `[label](/path)` markup. A link whose route
 * names a switched-off feature (B2.5), or whose target is unsafe, falls back
 * to its plain label: the link hides, it is never swapped for another target.
 */
export function GloveInlineLinks({
  text,
  isEnabled,
}: {
  text: string;
  isEnabled: (key: string) => boolean;
}): ReactNode {
  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const [whole, label = "", href = ""] = match;
    const index = match.index;
    if (index > cursor) out.push(text.slice(cursor, index));
    const flag = navHrefFlag(href);
    const allowed = isSafeHref(href) && (flag === null || isEnabled(flag));
    if (!allowed) {
      out.push(label);
    } else if (href.startsWith("/")) {
      out.push(
        <Link key={key++} href={href} className={LINK_CLASS}>
          {label}
        </Link>,
      );
    } else {
      out.push(
        <a
          key={key++}
          href={href}
          className={LINK_CLASS}
          {...(href.startsWith("https://")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {label}
          {href.startsWith("https://") ? (
            <span className="sr-only"> (opens in new tab)</span>
          ) : null}
        </a>,
      );
    }
    cursor = index + whole.length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return <>{out}</>;
}
