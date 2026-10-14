/** Readable documents for events. */
import { formatEventDate } from "~/lib/events/format";
import { esc, fieldTable } from "../html";
import { SITE_EXPORT_DIRS } from "../types";
import {
  docLink,
  indexDoc,
  linkHtml,
  mediaHref,
  photosGridHtml,
  plainTextHtml,
  shell,
} from "./shared";
import type { EventInput, RenderCtx } from "./types";

export const EVENTS_INDEX_PATH = `${SITE_EXPORT_DIRS.events}/index.html`;
const EVENTS_CRUMB = { label: "Events", zipPath: EVENTS_INDEX_PATH };

function whenText(e: EventInput, ctx: RenderCtx): string {
  try {
    return formatEventDate(e, ctx.timeZone ?? "UTC");
  } catch {
    return e.startAt.toISOString();
  }
}

function statusText(e: EventInput): string {
  if (!e.published) return "Draft (not visible on your site)";
  return e.isArchived ? "Past (archived)" : "Published";
}

export function renderEventDoc(
  e: EventInput,
  ctx: RenderCtx,
  docPath: string,
): string {
  const videoHref = e.coverVideo ? mediaHref(ctx, docPath, e.coverVideo) : null;
  const body = [
    fieldTable([
      ["Name", esc(e.name)],
      ["When", esc(whenText(e, ctx))],
      ["Time zone", esc(ctx.timeZone ?? "")],
      ["Location", esc(e.location ?? "")],
      ["Price", esc(e.priceLabel ?? "")],
      [
        "Link",
        e.externalUrl ? linkHtml(e.externalUrl, e.externalUrlLabel?.trim() ? e.externalUrlLabel : e.externalUrl) : "",
      ],
      ["Status", esc(statusText(e))],
      ["Address on your site", linkHtml(`${ctx.business.siteUrl}/events/${e.slug}`)],
    ]),
    e.coverImage ? `<h2>Flyer / cover image</h2>${photosGridHtml(ctx, docPath, [{ url: e.coverImage, alt: e.name }])}` : "",
    videoHref ? `<h2>Flyer video</h2><p><a href="${esc(videoHref)}">${esc(e.coverVideo)}</a></p>` : "",
    e.blurb ? `<h2>Details</h2>${plainTextHtml(e.blurb)}` : "",
  ].join("");
  return shell(ctx, {
    docPath,
    title: e.name,
    subtitle: whenText(e, ctx),
    breadcrumbs: [EVENTS_CRUMB, { label: e.name }],
    bodyHtml: body,
  });
}

export function renderEventsIndex(
  entries: Array<{ event: EventInput; path: string }>,
  ctx: RenderCtx,
): string {
  const sorted = [...entries].sort(
    (a, b) => b.event.startAt.getTime() - a.event.startAt.getTime(),
  );
  return indexDoc(ctx, {
    docPath: EVENTS_INDEX_PATH,
    title: "Events",
    intro: `${entries.length} event${entries.length === 1 ? "" : "s"}, most recent first.`,
    headers: ["Event", "When", "Location", "Status"],
    rows: sorted.map(({ event: e, path }) => [
      docLink(EVENTS_INDEX_PATH, path, e.name),
      esc(whenText(e, ctx)),
      esc(e.location ?? ""),
      esc(statusText(e)),
    ]),
    breadcrumbs: [{ label: "Events" }],
  });
}
