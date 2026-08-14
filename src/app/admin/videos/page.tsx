import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  resolveVideoTitle,
  videoSourceBadgeText,
} from "~/lib/validators/videos";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { matchesAllTokens, pickParam } from "../_lib/table-query";
import { VideosClient } from "./_components/videos-client";

type Props = {
  searchParams: Promise<{ tab?: string; search?: string }>;
};

// Local to this page — the tab switch is a plain link nav consumed by one
// `pickParam` call and the client's tab hrefs, not a shared filter tuple a
// router whitelists against.
const TAB_VALUES = ["published", "drafts"] as const;

export default async function AdminVideosPage({ searchParams }: Props) {
  // No feature-gate check here — `layout.tsx` already gates this whole
  // subtree with the identical `flags.isEnabled("videos")` check.
  const params = await searchParams;

  const tab = pickParam(params.tab, TAB_VALUES, "published");
  const search = params.search?.trim() ?? "";

  const [videos, sources] = await Promise.all([
    api.videos.getAll().catch(rethrowTrpcForErrorBoundary),
    api.videos.listSources().catch(rethrowTrpcForErrorBoundary),
  ]);

  // No `buildTablePage` / pagination here (§7 deviation): drag-to-reorder
  // against `videos.reorder` IS the ordering, and reorder is incompatible
  // with paging a row across pages.
  const published = videos.filter((v) => v.published);
  const drafts = videos.filter((v) => !v.published);

  const tabVideos = tab === "published" ? published : drafts;
  // Search covers exactly what the row renders: resolved title, channel, and
  // the source badge's text ("Added manually" / the playlist or channel
  // label) — the badge is how owners tell sources apart, so "Tutorials" must
  // find that playlist's videos. `matchesAllTokens` skips the `null` a
  // missing source resolves to.
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const rows = tabVideos.filter((v) =>
    matchesAllTokens(search, [
      resolveVideoTitle(v),
      v.channelTitle,
      videoSourceBadgeText(
        v,
        v.sourceId ? sourceById.get(v.sourceId) : undefined,
      ),
    ]),
  );

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Videos" }]} />
      <VideosClient
        tab={tab}
        rows={rows}
        search={search}
        publishedCount={published.length}
        draftsCount={drafts.length}
        sources={sources}
      />
    </>
  );
}

export const metadata = {
  title: "Videos",
};
