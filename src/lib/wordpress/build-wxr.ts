function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildWxr(clubNames: string[]): string {
  const now = new Date();
  const pubDate = now.toUTCString();
  const wpDate = now.toISOString().replace("T", " ").slice(0, 19);

  const listItems = clubNames
    .map((name) => `<li>${escapeXml(name)}</li>`)
    .join("\n");

  const rawContent = `<h2>Our community clubs</h2>
<ul>
${listItems}
</ul>
<p>Don't see what you're looking for? Start your own club.</p>`;
  // CDATA must not contain "]]>" - split so it's not literal
  const content = rawContent.replace(/\]\]>/g, "]]]]><![CDATA[>");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>Community Export</title>
  <link>https://example.com</link>
  <description>Community page export for WordPress</description>
  <pubDate>${pubDate}</pubDate>
  <language>en-US</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <item>
    <title>Community</title>
    <link>https://example.com/community/</link>
    <pubDate>${pubDate}</pubDate>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <guid isPermaLink="false">https://example.com/?page_id=1</guid>
    <description></description>
    <content:encoded><![CDATA[${content}]]></content:encoded>
    <excerpt:encoded><![CDATA[]]></excerpt:encoded>
    <wp:post_id>1</wp:post_id>
    <wp:post_type>page</wp:post_type>
    <wp:post_date>${wpDate}</wp:post_date>
    <wp:post_date_gmt>${wpDate}</wp:post_date_gmt>
    <wp:status>publish</wp:status>
    <wp:post_name>community</wp:post_name>
  </item>
</channel>
</rss>
`;
}

// wordpressCommunityWxr: protectedProcedure.query(async ({ ctx }) => {
//   const clubs = await ctx.db.club.findMany({
//     orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
//     select: { name: true },
//   });
//   const clubNames = clubs.map((c) => c.name);
//   const xml = buildWxr(clubNames);
//   return { xml };
// }),
