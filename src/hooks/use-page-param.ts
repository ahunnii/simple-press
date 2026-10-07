"use client";

import type { MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  buildPageHref,
  isPlainLeftClick,
  parsePageParam,
} from "~/lib/pagination";

interface PageNavOptions {
  /** Smooth-scroll to the top after navigating. Defaults to true. */
  scroll?: boolean;
}

/**
 * URL-backed page state (`?page=N`) for paginated listings.
 *
 * `pageLinkProps(n)` is meant to be spread onto an `<a>`: crawlers and
 * new-tab clicks get a real, crawlable `href`, while a plain left click is
 * intercepted and handled client-side (no full navigation, no scroll jump).
 */
export function usePageParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePageParam(searchParams.get("page"));

  function pageHref(n: number): string {
    return buildPageHref(pathname, searchParams.toString(), n);
  }

  function goToPage(n: number, { scroll = true }: PageNavOptions = {}) {
    router.replace(pageHref(n), { scroll: false });
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pageLinkProps(n: number, opts?: PageNavOptions) {
    return {
      href: pageHref(n),
      onClick: (e: MouseEvent<HTMLElement>) => {
        if (!isPlainLeftClick(e)) return;
        e.preventDefault();
        goToPage(n, opts);
      },
    };
  }

  return { page, pageHref, goToPage, pageLinkProps };
}
