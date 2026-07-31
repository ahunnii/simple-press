import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createBusiness, createOwnerUser, createPage } from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers`. Mock it
// with a mutable host so we can act as different tenants in one process (same
// pattern as tenant-isolation.test.ts).
const reqHost = vi.hoisted(() => ({ value: "tenant-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// The real preview-auth guard (cookie + x-sp-preview header + session/membership
// checks) lives in ~/lib/preview/preview-context and is out of scope for these
// tests — swap it for a hoisted switch so tests can flip an "authorized preview"
// on/off without wiring up cookies/sessions.
const previewSwitch = vi.hoisted(() => ({ on: false }));
vi.mock("~/lib/preview/preview-context", () => ({
  PREVIEW_COOKIE: "sp_preview",
  getAuthorizedPreviewBusinessId: vi.fn(async (businessId: string) =>
    previewSwitch.on ? businessId : null,
  ),
}));

const draftDoc = (label: string) => ({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: label }] },
  ],
});

describe("editor blog drafts", () => {
  beforeEach(async () => {
    previewSwitch.on = false;
    await resetDb();
  });

  describe("getEditorPages", () => {
    it("returns page and blog rows (including an unpublished blog post) when the blog flag is on, excluding policy/custom", async () => {
      const business = await createBusiness({
        subdomain: "editor-blog-on",
        featureFlags: { blog: true },
      });
      const owner = await createOwnerUser(business.id);

      const page = await createPage(business.id, {
        type: "page",
        title: "About",
      });
      const publishedBlog = await createPage(business.id, {
        type: "blog",
        title: "Published Post",
        published: true,
      });
      const unpublishedBlog = await createPage(business.id, {
        type: "blog",
        title: "Draft Post",
        published: false,
      });
      const policyPage = await createPage(business.id, {
        type: "policy",
        title: "Privacy",
      });
      const customPage = await createPage(business.id, {
        type: "custom",
        title: "Landing",
      });

      reqHost.value = "editor-blog-on.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const result = await caller.content.getEditorPages();
      const ids = result.map((p) => p.id);

      expect(ids).toContain(page.id);
      expect(ids).toContain(publishedBlog.id);
      expect(ids).toContain(unpublishedBlog.id);
      expect(ids).not.toContain(policyPage.id);
      expect(ids).not.toContain(customPage.id);

      expect(result.find((p) => p.id === page.id)?.type).toBe("page");
      expect(result.find((p) => p.id === publishedBlog.id)?.type).toBe(
        "blog",
      );
      const draftRow = result.find((p) => p.id === unpublishedBlog.id);
      expect(draftRow?.type).toBe("blog");
      expect(draftRow?.published).toBe(false);
    });

    it("returns only page rows when the blog flag is off (default)", async () => {
      const business = await createBusiness({ subdomain: "editor-blog-off" });
      const owner = await createOwnerUser(business.id);

      const page = await createPage(business.id, { type: "page" });
      await createPage(business.id, { type: "blog" });

      reqHost.value = "editor-blog-off.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const result = await caller.content.getEditorPages();
      expect(result.map((p) => p.id)).toEqual([page.id]);
      expect(result.every((p) => p.type === "page")).toBe(true);
    });
  });

  describe("saveCmsPageDraft", () => {
    it("writes previewDraft + previewDraftUpdatedAt for a blog post", async () => {
      const business = await createBusiness({ subdomain: "draft-save" });
      const owner = await createOwnerUser(business.id);
      const blogPage = await createPage(business.id, {
        type: "blog",
        title: "Live Title",
      });

      reqHost.value = "draft-save.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await caller.content.saveCmsPageDraft({
        pageId: blogPage.id,
        draft: {
          title: "Draft Title",
          excerpt: "Draft excerpt",
          content: draftDoc("draft body"),
        },
      });

      const row = await db.page.findUnique({ where: { id: blogPage.id } });
      expect(row?.previewDraft).toMatchObject({
        title: "Draft Title",
        excerpt: "Draft excerpt",
      });
      expect(row?.previewDraftUpdatedAt).toBeInstanceOf(Date);
      // Live columns are untouched by the draft save.
      expect(row?.title).toBe("Live Title");
    });

    it("throws NOT_FOUND for a policy page id", async () => {
      const business = await createBusiness({ subdomain: "draft-policy" });
      const owner = await createOwnerUser(business.id);
      const policyPage = await createPage(business.id, { type: "policy" });

      reqHost.value = "draft-policy.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await expect(
        caller.content.saveCmsPageDraft({
          pageId: policyPage.id,
          draft: { title: "x", excerpt: null, content: draftDoc("x") },
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND for a blog post belonging to a different business", async () => {
      const businessA = await createBusiness({ subdomain: "draft-a" });
      const businessB = await createBusiness({ subdomain: "draft-b" });
      const ownerA = await createOwnerUser(businessA.id);
      const blogB = await createPage(businessB.id, { type: "blog" });

      reqHost.value = "draft-a.simplepress.test";
      const callerA = createTestCaller({ userId: ownerA.id });

      await expect(
        callerA.content.saveCmsPageDraft({
          pageId: blogB.id,
          draft: { title: "x", excerpt: null, content: draftDoc("x") },
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("updateSiteContent publish (publishCmsPageDrafts)", () => {
    it("promotes both a page draft and a blog draft to their live columns and clears draft state", async () => {
      const business = await createBusiness({ subdomain: "publish-drafts" });
      const owner = await createOwnerUser(business.id);

      const pageDraft = {
        title: "New Page Title",
        excerpt: "New page excerpt",
        content: draftDoc("new page body"),
      };
      const blogDraft = {
        title: "New Blog Title",
        excerpt: "New blog excerpt",
        content: draftDoc("new blog body"),
      };

      const page = await createPage(business.id, {
        type: "page",
        title: "Old Page Title",
        excerpt: "Old page excerpt",
        previewDraft: pageDraft,
        previewDraftUpdatedAt: new Date(),
      });
      const blogPage = await createPage(business.id, {
        type: "blog",
        title: "Old Blog Title",
        excerpt: "Old blog excerpt",
        previewDraft: blogDraft,
        previewDraftUpdatedAt: new Date(),
      });

      reqHost.value = "publish-drafts.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await caller.content.updateSiteContent({
        customFields: {},
        clearPreviewDraft: true,
        publishCmsPageDrafts: true,
      });

      const updatedPage = await db.page.findUnique({ where: { id: page.id } });
      const updatedBlog = await db.page.findUnique({
        where: { id: blogPage.id },
      });

      expect(updatedPage?.title).toBe(pageDraft.title);
      expect(updatedPage?.excerpt).toBe(pageDraft.excerpt);
      expect(updatedPage?.content).toEqual(pageDraft.content);
      expect(updatedPage?.previewDraft).toBeNull();
      expect(updatedPage?.previewDraftUpdatedAt).toBeNull();

      expect(updatedBlog?.title).toBe(blogDraft.title);
      expect(updatedBlog?.excerpt).toBe(blogDraft.excerpt);
      expect(updatedBlog?.content).toEqual(blogDraft.content);
      expect(updatedBlog?.previewDraft).toBeNull();
      expect(updatedBlog?.previewDraftUpdatedAt).toBeNull();
    });
  });

  describe("discardEditorDrafts", () => {
    it("clears a blog draft without touching the live columns", async () => {
      const business = await createBusiness({ subdomain: "discard-drafts" });
      const owner = await createOwnerUser(business.id);

      const draft = {
        title: "Draft Title",
        excerpt: "Draft excerpt",
        content: draftDoc("draft body"),
      };
      const blogPage = await createPage(business.id, {
        type: "blog",
        title: "Live Title",
        excerpt: "Live excerpt",
        previewDraft: draft,
        previewDraftUpdatedAt: new Date(),
      });

      reqHost.value = "discard-drafts.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await caller.content.discardEditorDrafts();

      const row = await db.page.findUnique({ where: { id: blogPage.id } });
      expect(row?.previewDraft).toBeNull();
      expect(row?.previewDraftUpdatedAt).toBeNull();
      expect(row?.title).toBe("Live Title");
      expect(row?.excerpt).toBe("Live excerpt");
    });
  });

  describe("getBlogPostBySlug (public, no preview)", () => {
    it("returns null for an unpublished post", async () => {
      const business = await createBusiness({
        subdomain: "blog-public-1",
        featureFlags: { blog: true },
      });
      const post = await createPage(business.id, {
        type: "blog",
        published: false,
        slug: "hidden-post",
      });

      reqHost.value = "blog-public-1.simplepress.test";
      previewSwitch.on = false;
      const caller = createTestCaller({});

      const result = await caller.content.getBlogPostBySlug({
        slug: post.slug,
      });
      expect(result).toBeNull();
    });

    it("returns live values for a published post even when a draft is stored, without leaking draft columns", async () => {
      const business = await createBusiness({
        subdomain: "blog-public-2",
        featureFlags: { blog: true },
      });
      const draft = {
        title: "Draft Title",
        excerpt: "Draft excerpt",
        content: draftDoc("draft body"),
      };
      const post = await createPage(business.id, {
        type: "blog",
        published: true,
        title: "Live Title",
        excerpt: "Live excerpt",
        slug: "shown-post",
        previewDraft: draft,
        previewDraftUpdatedAt: new Date(),
      });

      reqHost.value = "blog-public-2.simplepress.test";
      previewSwitch.on = false;
      const caller = createTestCaller({});

      const result = await caller.content.getBlogPostBySlug({
        slug: post.slug,
      });
      expect(result?.title).toBe("Live Title");
      expect(result?.excerpt).toBe("Live excerpt");
      expect(result).not.toHaveProperty("previewDraft");
      expect(result).not.toHaveProperty("previewDraftUpdatedAt");
    });
  });

  describe("getBlogPostBySlug (authorized preview)", () => {
    it("returns an unpublished post", async () => {
      const business = await createBusiness({
        subdomain: "blog-preview-1",
        featureFlags: { blog: true },
      });
      const post = await createPage(business.id, {
        type: "blog",
        published: false,
        slug: "unpublished-preview",
      });

      reqHost.value = "blog-preview-1.simplepress.test";
      previewSwitch.on = true;
      const caller = createTestCaller({});

      const result = await caller.content.getBlogPostBySlug({
        slug: post.slug,
      });
      expect(result?.id).toBe(post.id);
    });

    it("swaps draft values into title/excerpt/content, still without leaking draft columns", async () => {
      const business = await createBusiness({
        subdomain: "blog-preview-2",
        featureFlags: { blog: true },
      });
      const draft = {
        title: "Draft Title",
        excerpt: "Draft excerpt",
        content: draftDoc("draft body"),
      };
      const post = await createPage(business.id, {
        type: "blog",
        published: true,
        title: "Live Title",
        excerpt: "Live excerpt",
        slug: "draft-preview",
        previewDraft: draft,
        previewDraftUpdatedAt: new Date(),
      });

      reqHost.value = "blog-preview-2.simplepress.test";
      previewSwitch.on = true;
      const caller = createTestCaller({});

      const result = await caller.content.getBlogPostBySlug({
        slug: post.slug,
      });
      expect(result?.title).toBe(draft.title);
      expect(result?.excerpt).toBe(draft.excerpt);
      expect(result?.content).toEqual(draft.content);
      expect(result).not.toHaveProperty("previewDraft");
      expect(result).not.toHaveProperty("previewDraftUpdatedAt");
    });

    it("falls back to live values when the stored draft is malformed", async () => {
      const business = await createBusiness({
        subdomain: "blog-preview-3",
        featureFlags: { blog: true },
      });
      const post = await createPage(business.id, {
        type: "blog",
        published: true,
        title: "Live Title",
        excerpt: "Live excerpt",
        slug: "malformed-draft",
        // Missing `excerpt`/`content` and an empty `title` — fails
        // cmsPageDraftValueSchema, so the live values must win.
        previewDraft: { title: "" },
        previewDraftUpdatedAt: new Date(),
      });

      reqHost.value = "blog-preview-3.simplepress.test";
      previewSwitch.on = true;
      const caller = createTestCaller({});

      const result = await caller.content.getBlogPostBySlug({
        slug: post.slug,
      });
      expect(result?.title).toBe("Live Title");
      expect(result?.excerpt).toBe("Live excerpt");
    });

    it("remaps createdAt to publishedAt when set, falling back to the real createdAt otherwise", async () => {
      const business = await createBusiness({
        subdomain: "blog-preview-4",
        featureFlags: { blog: true },
      });
      const publishedAt = new Date("2026-01-01T00:00:00.000Z");
      const withPublishedAt = await createPage(business.id, {
        type: "blog",
        published: true,
        slug: "with-published-at",
        publishedAt,
      });
      const withoutPublishedAt = await createPage(business.id, {
        type: "blog",
        published: false,
        slug: "without-published-at",
        publishedAt: null,
      });

      reqHost.value = "blog-preview-4.simplepress.test";
      previewSwitch.on = true;
      const caller = createTestCaller({});

      const result1 = await caller.content.getBlogPostBySlug({
        slug: withPublishedAt.slug,
      });
      expect(result1?.createdAt?.getTime()).toBe(publishedAt.getTime());

      const result2 = await caller.content.getBlogPostBySlug({
        slug: withoutPublishedAt.slug,
      });
      expect(result2?.createdAt?.getTime()).toBe(
        withoutPublishedAt.createdAt.getTime(),
      );
    });
  });
});
