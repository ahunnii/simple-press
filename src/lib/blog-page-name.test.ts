import { describe, expect, it } from "vitest";

import { DEFAULT_BLOG_PAGE_NAME, resolveBlogPageName } from "./blog-page-name";

describe("resolveBlogPageName", () => {
  it("is Blog for templates that do not declare a page name", () => {
    expect(resolveBlogPageName("default", {})).toBe(DEFAULT_BLOG_PAGE_NAME);
    expect(resolveBlogPageName("wealth", {})).toBe(DEFAULT_BLOG_PAGE_NAME);
    expect(resolveBlogPageName(null, {})).toBe(DEFAULT_BLOG_PAGE_NAME);
    expect(resolveBlogPageName("no-such-template", {})).toBe(
      DEFAULT_BLOG_PAGE_NAME,
    );
  });

  it("ignores another template's key", () => {
    expect(
      resolveBlogPageName("wealth", { "umsc.blog.page-name": "Community" }),
    ).toBe(DEFAULT_BLOG_PAGE_NAME);
  });

  it("uses umsc's default, then the saved value", () => {
    expect(resolveBlogPageName("umsc", {})).toBe("Community");
    expect(resolveBlogPageName("umsc", undefined)).toBe("Community");
    expect(resolveBlogPageName("umsc", { "umsc.blog.page-name": "Blog" })).toBe(
      "Blog",
    );
  });

  it("falls back to Blog when the saved value is blank", () => {
    expect(resolveBlogPageName("umsc", { "umsc.blog.page-name": "   " })).toBe(
      DEFAULT_BLOG_PAGE_NAME,
    );
  });
});
