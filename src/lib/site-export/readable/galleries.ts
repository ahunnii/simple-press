/** Readable documents for photo galleries. */
import { esc, fieldTable } from "../html";
import { SITE_EXPORT_DIRS } from "../types";
import {
  docLink,
  indexDoc,
  photosGridHtml,
  plainTextHtml,
  shell,
} from "./shared";
import type { GalleryInput, RenderCtx } from "./types";

export const GALLERIES_INDEX_PATH = `${SITE_EXPORT_DIRS.galleries}/index.html`;
const GALLERIES_CRUMB = { label: "Galleries", zipPath: GALLERIES_INDEX_PATH };

export function renderGalleryDoc(
  g: GalleryInput,
  ctx: RenderCtx,
  docPath: string,
): string {
  const body = [
    fieldTable([
      ["Name", esc(g.name)],
      ["Layout", esc(g.layout ?? "")],
      ["Number of photos", esc(g.images.length)],
    ]),
    g.description ? plainTextHtml(g.description) : "",
    g.images.length > 0
      ? `<h2>Photos</h2>${photosGridHtml(ctx, docPath, g.images)}`
      : `<p class="muted">This gallery has no photos.</p>`,
  ].join("");
  return shell(ctx, {
    docPath,
    title: g.name,
    breadcrumbs: [GALLERIES_CRUMB, { label: g.name }],
    bodyHtml: body,
  });
}

export function renderGalleriesIndex(
  entries: Array<{ gallery: GalleryInput; path: string }>,
  ctx: RenderCtx,
): string {
  return indexDoc(ctx, {
    docPath: GALLERIES_INDEX_PATH,
    title: "Galleries",
    intro: `${entries.length} ${entries.length === 1 ? "gallery" : "galleries"}. The picture files are in the Photos folder; the images in these documents point at those copies.`,
    headers: ["Gallery", "Photos"],
    rows: entries.map(({ gallery: g, path }) => [
      docLink(GALLERIES_INDEX_PATH, path, g.name),
      esc(g.images.length),
    ]),
    breadcrumbs: [{ label: "Galleries" }],
  });
}
