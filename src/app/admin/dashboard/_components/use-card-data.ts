"use client";

import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import { toCardDataInput } from "~/lib/dashboard/card-data";
import { getWidget } from "~/lib/dashboard/widgets";
import { api } from "~/trpc/react";

const STALE_FAST_MS = 60 * 1000;
/** Umami round-trips are slow and the numbers move slowly: don't refetch on every focus. */
const STALE_UMAMI_MS = 5 * 60 * 1000;

/**
 * Suspense read of one card's data.
 *
 * The input is built ONLY by `toCardDataInput` — the page prefetches with the
 * same function, so the server-dehydrated query and this one share a cache key
 * and the card never fetches twice on first load.
 */
export function useCardData(card: DashboardCard) {
  const def = getWidget(card.widget);
  // A Trend chart plotting Visitors reads from Umami like the Visitors card.
  const umami =
    def.requires.umami === true ||
    (card.metric !== undefined &&
      getWidget(card.metric).requires.umami === true);

  const [data] = api.dashboard.cardData.useSuspenseQuery(
    toCardDataInput(card),
    {
      staleTime: umami ? STALE_UMAMI_MS : STALE_FAST_MS,
      ...(umami ? { refetchOnWindowFocus: false } : {}),
    },
  );
  return data;
}
