"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * BambooRouteAnnouncer
 *
 * Announces client-side route transitions to screen readers via a
 * visually-hidden aria-live region. On each pathname change the component
 * reads document.title (set by Next.js metadata) and pushes it into the
 * live region so assistive technologies announce the new page name.
 *
 * The initial render is intentionally silent (empty message) so no
 * announcement fires on first page load.
 */
export function BambooRouteAnnouncer() {
  const pathname = usePathname();
  const [message, setMessage] = useState("");

  useEffect(() => {
    // document.title may not yet reflect the new page when the effect first
    // runs, so defer by one tick to give Next.js time to update the title.
    const id = setTimeout(() => {
      const title = document.title?.trim();
      setMessage(title ? title : "Page changed");
    }, 0);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
