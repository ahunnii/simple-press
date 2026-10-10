/** Readable documents for blog posts. */
import { esc, fieldTable } from "../html";
import { SITE_EXPORT_DIRS } from "../types";
import { pageTypeLabel, widgetNotice } from "./pages";
import {
  docLink,
  formatDate,
  imgHtml,
  indexDoc,
  inlineText,
  linkHtml,
  photosGridHtml,
  richTextHtml,
  seoRows,
  shell,
} from "./shared";
import type { PageInput, RenderCtx } from "./types";

export const BLOG_INDEX_PATH = `${SITE_EXPORT_DIRS.blog}/index.html`;
const BLOG_CRUMB = { label: "Blog", zipPath: BLOG_INDEX_PATH };

function postDate(post: PageInput): Date {
  return post.publishedAt ?? post.createdAt;
}

export function renderBlogPostDoc(
  post: PageInput,
  ctx: RenderCtx,
  docPath: string,
): string {
  const { html, warnings } = richTextHtml(ctx, docPath, post.content);
  const meta = fieldTable([
    ["Post title", esc(post.title)],
    ["Date", esc(formatDate(postDate(post), ctx.timeZone))],
    ["Status", post.published ? "Published" : "Draft (not visible on your site)"],
    ["Address on your site", linkHtml(`${ctx.business.siteUrl}/blog/${post.slug}`)],
    ["Short summary (excerpt)", inlineText(post.excerpt)],
    ...seoRows(post),
    ["Social share image", post.ogImage ? imgHtml(ctx, docPath, post.ogImage, "") : ""],
  ]);
  const featured = post.image
    ? `<h2>Featured image</h2>${photosGridHtml(ctx, docPath, [{ url: post.image, alt: post.title }])}`
    : "";
  const body = html
    ? `<h2>Post</h2>${widgetNotice(warnings)}<div class="rich">${html}</div>`
    : `<p class="muted">This post has no text content.</p>`;
  return shell(ctx, {
    docPath,
    title: post.title,
    subtitle: pageTypeLabel("blog"),
    breadcrumbs: [BLOG_CRUMB, { label: post.title }],
    bodyHtml: meta + featured + body,
  });
}

export function renderBlogIndex(
  entries: Array<{ post: PageInput; path: string }>,
  ctx: RenderCtx,
): string {
  const sorted = [...entries].sort(
    (a, b) => postDate(b.post).getTime() - postDate(a.post).getTime(),
  );
  return indexDoc(ctx, {
    docPath: BLOG_INDEX_PATH,
    title: "Blog",
    intro: `${entries.length} post${entries.length === 1 ? "" : "s"}, newest first.`,
    headers: ["Post", "Date", "Status"],
    rows: sorted.map(({ post, path }) => [
      docLink(BLOG_INDEX_PATH, path, post.title),
      esc(formatDate(postDate(post), ctx.timeZone)),
      post.published ? "Published" : "Draft",
    ]),
    breadcrumbs: [{ label: "Blog" }],
  });
}
