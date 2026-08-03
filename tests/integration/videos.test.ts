import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createOwnerUser,
  createVideo,
  createVideoSource,
} from "../helpers/factories";

// Every procedure under test resolves its tenant from the request host
// (`getBusinessProcedure` for public reads, the membership check baked into
// `ownerAdminProcedure` for admin writes), so the host has to be mockable
// per-test — same boilerplate as events.test.ts / tenant-isolation.test.ts.
const reqHost = vi.hoisted(() => ({ value: "videos-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// These three modules do real network I/O in production (oEmbed fetch,
// YouTube channel-handle resolution, feed sync). Tests must never hit the
// network, so every test that reaches a procedure calling into them mocks
// the return value explicitly.
const oembedMock = vi.hoisted(() => ({ fetchVideoOembed: vi.fn() }));
vi.mock("~/lib/youtube/oembed", () => oembedMock);

const resolveChannelMock = vi.hoisted(() => ({
  resolveChannelHandle: vi.fn(),
}));
vi.mock("~/lib/youtube/resolve-channel", () => resolveChannelMock);

const syncMock = vi.hoisted(() => ({ syncOneSource: vi.fn() }));
vi.mock("~/lib/youtube/sync", () => syncMock);

// `videos` is `enabledByDefault: false` in the feature registry, so every
// business used here must opt in explicitly or `featureGate("videos")` throws
// FORBIDDEN before the query under test ever runs.
function videosBusiness(opts: Parameters<typeof createBusiness>[0] = {}) {
  return createBusiness({
    ...opts,
    featureFlags: { videos: true, ...opts.featureFlags },
  });
}

describe("videos", () => {
  beforeEach(async () => {
    await resetDb();
    oembedMock.fetchVideoOembed.mockReset();
    resolveChannelMock.resolveChannelHandle.mockReset();
    syncMock.syncOneSource.mockReset();
  });

  describe("video CRUD", () => {
    it("round-trips create → getById → update → delete", async () => {
      const business = await videosBusiness({ subdomain: "videos-crud" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-crud.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      oembedMock.fetchVideoOembed.mockResolvedValue({
        title: "My Cool Video",
        authorName: "My Channel",
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      });

      const created = await caller.videos.create({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      expect(created.youtubeId).toBe("dQw4w9WgXcQ");
      expect(created.title).toBe("My Cool Video");
      expect(created.channelTitle).toBe("My Channel");
      expect(created.sourceId).toBeNull();
      expect(created.published).toBe(true);

      const fetched = await caller.videos.getById(created.id);
      expect(fetched.id).toBe(created.id);

      const updated = await caller.videos.update({
        id: created.id,
        titleOverride: "Custom Title",
        published: false,
      });
      expect(updated.titleOverride).toBe("Custom Title");
      expect(updated.published).toBe(false);

      await caller.videos.delete(created.id);
      await expect(caller.videos.getById(created.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("getAll returns all videos for the business, unfiltered", async () => {
      const business = await videosBusiness({ subdomain: "videos-getall" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-getall.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await createVideo(business.id, { title: "Published", published: true });
      await createVideo(business.id, { title: "Draft", published: false });

      const all = await caller.videos.getAll();
      expect(all).toHaveLength(2);
    });

    it("getById 404s for a missing id", async () => {
      const business = await videosBusiness({ subdomain: "videos-404" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-404.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await expect(caller.videos.getById("nope")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("video source CRUD", () => {
    it("round-trips createSource → listSources → updateSource → deleteSource", async () => {
      const business = await videosBusiness({ subdomain: "videos-source-crud" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-source-crud.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const created = await caller.videos.createSource({
        input: "https://www.youtube.com/channel/UC1234567890123456789012",
        label: "Main Channel",
        autoPublish: true,
      });
      expect(created.kind).toBe("channel");
      expect(created.externalId).toBe("UC1234567890123456789012");

      const listed = await caller.videos.listSources();
      expect(listed).toHaveLength(1);
      expect(listed[0]?._count.videos).toBe(0);

      const updated = await caller.videos.updateSource({
        id: created.id,
        label: "Renamed",
        enabled: false,
      });
      expect(updated.label).toBe("Renamed");
      expect(updated.enabled).toBe(false);

      await caller.videos.deleteSource(created.id);
      const listedAfter = await caller.videos.listSources();
      expect(listedAfter).toHaveLength(0);
    });

    it("deleteSource leaves its videos in place with sourceId set to null", async () => {
      const business = await videosBusiness({ subdomain: "videos-source-del" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-source-del.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const source = await createVideoSource(business.id);
      const video = await createVideo(business.id, { sourceId: source.id });

      await caller.videos.deleteSource(source.id);

      const stillThere = await db.video.findUnique({ where: { id: video.id } });
      expect(stillThere).not.toBeNull();
      expect(stillThere?.sourceId).toBeNull();
    });
  });

  describe("tenant isolation", () => {
    it("404s getById/update/delete/syncNow against another business's video/source id, and leaves rows untouched", async () => {
      const businessA = await videosBusiness({ subdomain: "videos-admin-a" });
      const businessB = await videosBusiness({ subdomain: "videos-admin-b" });
      const ownerA = await createOwnerUser(businessA.id);

      const foreignVideo = await createVideo(businessB.id, {
        title: "Belongs to B",
      });
      const foreignSource = await createVideoSource(businessB.id, {
        label: "B's channel",
      });

      reqHost.value = "videos-admin-a.simplepress.test";
      const callerA = createTestCaller({ userId: ownerA.id });

      await expect(
        callerA.videos.getById(foreignVideo.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.videos.update({ id: foreignVideo.id, titleOverride: "Hijacked" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.videos.delete(foreignVideo.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.videos.updateSource({ id: foreignSource.id, label: "Hijacked" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.videos.deleteSource(foreignSource.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        callerA.videos.syncNow(foreignSource.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(syncMock.syncOneSource).not.toHaveBeenCalled();

      // A silent no-op on any of the above would also satisfy a naive "it
      // rejected" assertion — confirm the rows are completely untouched.
      const stillVideo = await db.video.findUnique({
        where: { id: foreignVideo.id },
      });
      expect(stillVideo?.title).toBe("Belongs to B");
      expect(stillVideo?.titleOverride).toBeNull();

      const stillSource = await db.videoSource.findUnique({
        where: { id: foreignSource.id },
      });
      expect(stillSource?.label).toBe("B's channel");
    });
  });

  describe("syncNow", () => {
    it("verifies source ownership before delegating to syncOneSource", async () => {
      const business = await videosBusiness({ subdomain: "videos-sync" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-sync.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const source = await createVideoSource(business.id);
      syncMock.syncOneSource.mockResolvedValue({ added: 3, updated: 1 });

      const result = await caller.videos.syncNow(source.id);
      expect(result).toEqual({ added: 3, updated: 1 });
      expect(syncMock.syncOneSource).toHaveBeenCalledWith(
        expect.anything(),
        source.id,
      );
    });

    it("maps a syncOneSource feed failure to BAD_REQUEST rather than a raw 500", async () => {
      const business = await videosBusiness({ subdomain: "videos-sync-fail" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-sync-fail.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const source = await createVideoSource(business.id);
      syncMock.syncOneSource.mockRejectedValue(
        new Error("feed request failed: 404"),
      );

      await expect(caller.videos.syncNow(source.id)).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("feed request failed: 404"),
      });
    });
  });

  describe("reorder", () => {
    it("persists the new sortOrder", async () => {
      const business = await videosBusiness({ subdomain: "videos-reorder" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-reorder.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      const first = await createVideo(business.id, { sortOrder: 0 });
      const second = await createVideo(business.id, { sortOrder: 1 });
      const third = await createVideo(business.id, { sortOrder: 2 });

      await caller.videos.reorder({ ids: [third.id, first.id, second.id] });

      const all = await caller.videos.getAll();
      const orderMap = new Map(all.map((v) => [v.id, v.sortOrder]));
      expect(orderMap.get(third.id)).toBe(0);
      expect(orderMap.get(first.id)).toBe(1);
      expect(orderMap.get(second.id)).toBe(2);
    });
  });

  describe("getPublic", () => {
    it("excludes published: false rows and respects limit", async () => {
      const business = await videosBusiness({ subdomain: "videos-public" });
      reqHost.value = "videos-public.simplepress.test";

      const draft = await createVideo(business.id, {
        title: "Draft",
        published: false,
      });
      const pub1 = await createVideo(business.id, {
        title: "Pub 1",
        published: true,
        sortOrder: 0,
      });
      const pub2 = await createVideo(business.id, {
        title: "Pub 2",
        published: true,
        sortOrder: 1,
      });

      const caller = createTestCaller({});
      const all = await caller.videos.getPublic();
      const ids = all.map((v) => v.id);
      expect(ids).not.toContain(draft.id);
      expect(ids).toEqual([pub1.id, pub2.id]);

      const limited = await caller.videos.getPublic({ limit: 1 });
      expect(limited.map((v) => v.id)).toEqual([pub1.id]);
    });

    it("throws FORBIDDEN when the videos feature flag is off", async () => {
      // No `videos: true` override — enabledByDefault is false.
      await createBusiness({ subdomain: "videos-off" });
      reqHost.value = "videos-off.simplepress.test";

      const caller = createTestCaller({});
      await expect(caller.videos.getPublic()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("never returns another business's videos for the resolved host", async () => {
      const businessA = await videosBusiness({ subdomain: "videos-cross-a" });
      const businessB = await videosBusiness({ subdomain: "videos-cross-b" });

      const videoA = await createVideo(businessA.id, { title: "Video A" });
      const videoB = await createVideo(businessB.id, { title: "Video B" });

      reqHost.value = "videos-cross-b.simplepress.test";
      const caller = createTestCaller({});
      const result = await caller.videos.getPublic();
      const ids = result.map((v) => v.id);

      expect(ids).toContain(videoB.id);
      expect(ids).not.toContain(videoA.id);
    });
  });

  describe("create validation", () => {
    it("rejects an unparseable URL with BAD_REQUEST before this even reaches the router (zod refine)", async () => {
      const business = await videosBusiness({ subdomain: "videos-bad-url" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-bad-url.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      await expect(
        caller.videos.create({ url: "https://example.com/not-a-video" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(oembedMock.fetchVideoOembed).not.toHaveBeenCalled();
    });

    it("rejects when oEmbed returns null (private/deleted video) with BAD_REQUEST", async () => {
      const business = await videosBusiness({ subdomain: "videos-private" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-private.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      oembedMock.fetchVideoOembed.mockResolvedValue(null);

      await expect(
        caller.videos.create({
          url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects a duplicate youtubeId for the same business with CONFLICT, but allows the same id under a different business", async () => {
      const businessA = await videosBusiness({ subdomain: "videos-dupe-a" });
      const businessB = await videosBusiness({ subdomain: "videos-dupe-b" });
      const ownerA = await createOwnerUser(businessA.id);
      const ownerB = await createOwnerUser(businessB.id);

      oembedMock.fetchVideoOembed.mockResolvedValue({
        title: "Shared Video",
        authorName: null,
        thumbnailUrl: null,
      });

      reqHost.value = "videos-dupe-a.simplepress.test";
      const callerA = createTestCaller({ userId: ownerA.id });
      await callerA.videos.create({
        url: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
      });

      await expect(
        callerA.videos.create({
          url: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      reqHost.value = "videos-dupe-b.simplepress.test";
      const callerB = createTestCaller({ userId: ownerB.id });
      const createdB = await callerB.videos.create({
        url: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
      });
      expect(createdB.youtubeId).toBe("bbbbbbbbbbb");
      expect(createdB.businessId).toBe(businessB.id);
    });
  });

  describe("createSource validation", () => {
    it("rejects a handle that fails to resolve with BAD_REQUEST mentioning YouTube Studio", async () => {
      const business = await videosBusiness({ subdomain: "videos-handle" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-handle.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      resolveChannelMock.resolveChannelHandle.mockResolvedValue(null);

      await expect(
        caller.videos.createSource({
          input: "https://www.youtube.com/@someunresolvablehandle",
          autoPublish: true,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("YouTube Studio"),
      });
    });

    it("resolves a handle to a channel id and creates the source as kind: channel", async () => {
      const business = await videosBusiness({ subdomain: "videos-handle-ok" });
      const owner = await createOwnerUser(business.id);
      reqHost.value = "videos-handle-ok.simplepress.test";
      const caller = createTestCaller({ userId: owner.id });

      resolveChannelMock.resolveChannelHandle.mockResolvedValue(
        "UC9999999999999999999999",
      );

      const created = await caller.videos.createSource({
        input: "https://www.youtube.com/@resolvablehandle",
        autoPublish: true,
      });
      expect(created.kind).toBe("channel");
      expect(created.externalId).toBe("UC9999999999999999999999");
    });
  });
});
