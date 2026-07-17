/**
 * Generic WordPress WXR 1.2 document builder.
 *
 * Pure functions only — no Prisma, no React. Given a channel description and
 * a list of content items, produces a WXR (WordPress eXtended RSS) XML
 * document string suitable for import via the WordPress importer.
 *
 * See `build-wxr.ts` for the legacy hardcoded single-purpose generator this
 * was generalized from (namespaces/envelope structure match that file).
 */

export interface WxrChannel {
  /** Business name. */
  title: string;
  /** Storefront base URL, no trailing slash. */
  link: string;
  description?: string;
  /** Defaults to "en-US". */
  language?: string;
}

export interface WxrAttachment {
  /** Becomes wp:attachment_url. */
  url: string;
  /** Defaults to the URL's filename. */
  title?: string;
}

export interface WxrItem {
  title: string;
  /** wp:post_name */
  slug: string;
  /** Already-rendered HTML for content:encoded. */
  contentHtml: string;
  excerpt?: string;
  postDateGmt: Date;
  status: "publish" | "draft";
  type: "page" | "post";
  menuOrder?: number;
  /** <category domain="category" nicename="..."> */
  categories?: string[];
  /** Media used by this item, emitted as attachment items. */
  attachments?: WxrAttachment[];
  /** Also emitted as an attachment + _thumbnail_id postmeta on this item. */
  featuredImageUrl?: string;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function cdata(s: string): string {
  const safe = s.replace(/\]\]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

export function formatWpDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function slugifyCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const last = parts[parts.length - 1];
    return last && last.length > 0 ? last : url;
  } catch {
    const parts = url.split("/");
    const last = parts[parts.length - 1];
    return last && last.length > 0 ? last : url;
  }
}

interface ResolvedAttachment {
  postId: number;
  url: string;
  title: string;
  parentPostId: number;
  postDateGmt: Date;
}

interface ResolvedItem {
  item: WxrItem;
  postId: number;
  thumbnailAttachmentId: number | null;
}

const FIRST_CONTENT_POST_ID = 100;

function renderAttachmentItem(att: ResolvedAttachment): string {
  const wpDate = formatWpDate(att.postDateGmt);
  return `  <item>
    <title>${escapeXml(att.title)}</title>
    <link>${escapeXml(att.url)}</link>
    <pubDate>${att.postDateGmt.toUTCString()}</pubDate>
    <dc:creator>${cdata("admin")}</dc:creator>
    <guid isPermaLink="false">${escapeXml(`${att.url}`)}</guid>
    <description></description>
    <content:encoded>${cdata("")}</content:encoded>
    <excerpt:encoded>${cdata("")}</excerpt:encoded>
    <wp:post_id>${att.postId}</wp:post_id>
    <wp:post_date>${wpDate}</wp:post_date>
    <wp:post_date_gmt>${wpDate}</wp:post_date_gmt>
    <wp:comment_status>closed</wp:comment_status>
    <wp:ping_status>closed</wp:ping_status>
    <wp:post_name>${cdata(filenameFromUrl(att.url))}</wp:post_name>
    <wp:status>${cdata("inherit")}</wp:status>
    <wp:post_parent>${att.parentPostId}</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:post_type>attachment</wp:post_type>
    <wp:post_password></wp:post_password>
    <wp:is_sticky>0</wp:is_sticky>
    <wp:attachment_url>${escapeXml(att.url)}</wp:attachment_url>
  </item>`;
}

function renderContentItem(
  channel: WxrChannel,
  resolved: ResolvedItem,
): string {
  const { item, postId, thumbnailAttachmentId } = resolved;
  const wpDate = formatWpDate(item.postDateGmt);
  const categories = (item.categories ?? [])
    .map(
      (name) =>
        `    <category domain="category" nicename="${escapeXml(
          slugifyCategory(name),
        )}">${cdata(name)}</category>`,
    )
    .join("\n");

  const postmeta =
    thumbnailAttachmentId !== null
      ? `    <wp:postmeta>
      <wp:meta_key>_thumbnail_id</wp:meta_key>
      <wp:meta_value>${thumbnailAttachmentId}</wp:meta_value>
    </wp:postmeta>\n`
      : "";

  return `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${escapeXml(`${channel.link}/${item.slug}`)}</link>
    <pubDate>${item.postDateGmt.toUTCString()}</pubDate>
    <dc:creator>${cdata("admin")}</dc:creator>
    <guid isPermaLink="false">${escapeXml(`${channel.link}/?p=${postId}`)}</guid>
    <description></description>
    <content:encoded>${cdata(item.contentHtml)}</content:encoded>
    <excerpt:encoded>${cdata(item.excerpt ?? "")}</excerpt:encoded>
    <wp:post_id>${postId}</wp:post_id>
    <wp:post_date>${wpDate}</wp:post_date>
    <wp:post_date_gmt>${wpDate}</wp:post_date_gmt>
    <wp:comment_status>closed</wp:comment_status>
    <wp:ping_status>closed</wp:ping_status>
    <wp:post_name>${cdata(item.slug)}</wp:post_name>
    <wp:status>${cdata(item.status)}</wp:status>
    <wp:post_parent>0</wp:post_parent>
    <wp:menu_order>${item.menuOrder ?? 0}</wp:menu_order>
    <wp:post_type>${cdata(item.type)}</wp:post_type>
    <wp:post_password></wp:post_password>
    <wp:is_sticky>0</wp:is_sticky>
${postmeta}${categories ? categories + "\n" : ""}  </item>`;
}

export function buildWxrDocument(
  channel: WxrChannel,
  items: WxrItem[],
  now: Date = new Date(),
): string {
  let nextPostId = FIRST_CONTENT_POST_ID;

  // First pass: assign post ids to content items.
  const itemPostIds = items.map(() => nextPostId++);

  // Second pass: collect unique attachment URLs (in first-seen order),
  // parented to the first item that references them, and assign attachment
  // post ids continuing the same sequence.
  const attachmentsByUrl = new Map<string, ResolvedAttachment>();

  items.forEach((item, index) => {
    const postId = itemPostIds[index]!;
    const urls: WxrAttachment[] = [
      ...(item.attachments ?? []),
      ...(item.featuredImageUrl
        ? [{ url: item.featuredImageUrl }]
        : []),
    ];
    for (const att of urls) {
      if (!attachmentsByUrl.has(att.url)) {
        attachmentsByUrl.set(att.url, {
          postId: nextPostId++,
          url: att.url,
          title: att.title ?? filenameFromUrl(att.url),
          parentPostId: postId,
          postDateGmt: item.postDateGmt,
        });
      }
    }
  });

  const resolvedItems: ResolvedItem[] = items.map((item, index) => {
    const thumbnailAttachmentId = item.featuredImageUrl
      ? (attachmentsByUrl.get(item.featuredImageUrl)?.postId ?? null)
      : null;
    return {
      item,
      postId: itemPostIds[index]!,
      thumbnailAttachmentId,
    };
  });

  const contentItemsXml = resolvedItems
    .map((resolved) => renderContentItem(channel, resolved))
    .join("\n");

  const attachmentItemsXml = Array.from(attachmentsByUrl.values())
    .map((att) => renderAttachmentItem(att))
    .join("\n");

  const description = channel.description ?? "";
  const language = channel.language ?? "en-US";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>${escapeXml(channel.title)}</title>
  <link>${escapeXml(channel.link)}</link>
  <description>${escapeXml(description)}</description>
  <pubDate>${now.toUTCString()}</pubDate>
  <language>${escapeXml(language)}</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${escapeXml(channel.link)}</wp:base_site_url>
  <wp:base_blog_url>${escapeXml(channel.link)}</wp:base_blog_url>
  <wp:author>
    <wp:author_id>1</wp:author_id>
    <wp:author_login>${cdata("admin")}</wp:author_login>
    <wp:author_email>${cdata("")}</wp:author_email>
    <wp:author_display_name>${cdata("")}</wp:author_display_name>
    <wp:author_first_name>${cdata("")}</wp:author_first_name>
    <wp:author_last_name>${cdata("")}</wp:author_last_name>
  </wp:author>
${contentItemsXml}${attachmentItemsXml ? "\n" + attachmentItemsXml : ""}
</channel>
</rss>
`;
}
