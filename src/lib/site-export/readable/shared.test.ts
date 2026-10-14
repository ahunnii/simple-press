import { describe, expect, it } from "vitest";

import { ctx, page } from "./fixtures";
import { renderBlogPostDoc } from "./blog";
import { renderPageDoc } from "./pages";
import { imgHtml, plainTextHtml, rewriteMediaInHtml, richTextHtml } from "./shared";

describe("rewriteMediaInHtml", () => {
  it("rewrites known images (decoding entities in the lookup) and leaves others", () => {
    const media = {
      byUrl: new Map([["https://cdn.example.com/a?x=1&y=2", "Photos/Blog/a.jpg"]]),
    };
    const html =
      '<p><img src="https://cdn.example.com/a?x=1&amp;y=2" alt="a"><img src="https://x.test/b.jpg"></p>';
    const out = rewriteMediaInHtml(html, "Blog/Post.html", media);
    expect(out).toContain('src="../Photos/Blog/a.jpg"');
    expect(out).toContain('src="https://x.test/b.jpg"');
  });
});

describe("imgHtml", () => {
  it("drops site-relative images that are not in the export", () => {
    expect(imgHtml(ctx, "Services/Massage.html", "/placeholder.svg")).toBe("");
    expect(imgHtml(ctx, "Services/Massage.html", "https://x.test/a.jpg")).toContain(
      'src="https://x.test/a.jpg"',
    );
    expect(imgHtml(ctx, "Services/Massage.html", "//x.test/a.jpg")).toContain('src="//x.test/a.jpg"');
  });
});

describe("plainTextHtml", () => {
  it("escapes and splits paragraphs", () => {
    expect(plainTextHtml("a <b>\nc\n\nd")).toBe("<p>a &lt;b&gt;<br>c</p><p>d</p>");
  });
});

describe("richTextHtml", () => {
  it("reports unknown gallery warnings through onWarning", () => {
    const seen: string[] = [];
    richTextHtml(
      { ...ctx, onWarning: (_p, m) => seen.push(m) },
      "Pages/A.html",
      { type: "doc", content: [{ type: "gallery", attrs: { galleryId: "nope" } }] },
    );
    expect(seen[0]).toContain("gallery not found");
  });
});

describe("page and blog docs", () => {
  it("rewrites body images and links breadcrumbs", () => {
    const html = renderPageDoc(page(), ctx, "Pages/About.html");
    expect(html).toContain('src="../Photos/Pages/hero.jpg"');
    expect(html).toContain('href="index.html"');
    expect(html).toContain('href="../START%20HERE.html"');
    expect(html).toContain("https://mug.example.com/about");
  });

  it("marks drafts and escapes hostile titles", () => {
    const html = renderBlogPostDoc(
      page({ title: "<script>x</script>", published: false, type: "blog", slug: "p" }),
      ctx,
      "Blog/post.html",
    );
    expect(html).not.toContain("<script>x");
    expect(html).toContain("Draft");
    expect(html).toContain("https://mug.example.com/blog/p");
    expect(html).toContain('href="index.html"');
  });
});
