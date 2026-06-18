"use client";

/**
 * TrackView — fires a single Umami custom event on mount.
 *
 * Drop this into any server-component page (client island pattern) to track
 * page/product view events without requiring the whole page to be a client
 * component.
 *
 * Renders null — no DOM output.
 *
 * Example:
 *   <TrackView
 *     event={ANALYTICS_EVENTS.PRODUCT_VIEW}
 *     data={{ productId: product.id }}
 *   />
 */
import { useEffect } from "react";

import { track } from "~/lib/umami/track";

type TrackViewProps = {
  event: string;
  data?: Record<string, string | number | boolean>;
};

export function TrackView({ event, data }: TrackViewProps) {
  useEffect(() => {
    track(event, data);
    // Fire only once on mount — deps intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
