import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaReference } from "./media";
import type { DownloadedObject } from "~/lib/s3/download";
import type * as DownloadModule from "~/lib/s3/download";
import type { ListedObject, MediaKind } from "~/lib/s3/list";
import type { TemplateField } from "~/lib/template-fields";
import { keyToPublicUrl } from "~/lib/s3/url";

import {
  assignStoredPaths,
  buildMediaIndex,
  collectCustomFieldReferences,
  collectJsonReferences,
  fileExtension,
  planExternalImages,
  referenceToKey,
  toExternalSource,
} from "./media";

// ─── Mocks (no DB, no S3, no network) ─────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  db: {
    business: { findUnique: vi.fn() },
    siteContent: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    collection: { findMany: vi.fn() },
    gallery: { findMany: vi.fn() },
    page: { findMany: vi.fn() },
    service: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    testimonial: { findMany: vi.fn() },
    productReview: { findMany: vi.fn() },
    video: { findMany: vi.fn() },
  },
  listBusinessObjects: vi.fn(),
  downloadStoredObjects: vi.fn(),
  safeFetch: vi.fn(),
}));

vi.mock("~/server/db", () => ({ db: mocks.db }));
vi.mock("~/lib/s3/list", () => ({
  listBusinessObjects: mocks.listBusinessObjects,
}));
vi.mock("~/lib/s3/download", async (importOriginal) => ({
  ...(await importOriginal<typeof DownloadModule>()),
  downloadStoredObjects: mocks.downloadStoredObjects,
}));
vi.mock("~/lib/safe-fetch", () => ({ safeFetch: mocks.safeFetch }));

const BIZ = "biz1";
const k = (suffix: string) => `${BIZ}/${suffix}`;
const u = (suffix: string) => keyToPublicUrl(k(suffix));

function obj(
  suffix: string,
  kind: MediaKind = "image",
  contentType?: string,
): { key: string; kind: MediaKind; contentType?: string } {
  return { key: k(suffix), kind, ...(contentType ? { contentType } : {}) };
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

describe("referenceToKey", () => {
  it("resolves public URLs (with or without query/hash) and bare keys", () => {
    expect(referenceToKey(u("image-a.jpg"), BIZ)).toBe(k("image-a.jpg"));
    expect(referenceToKey(`${u("logo.png")}?v=123`, BIZ)).toBe(k("logo.png"));
    expect(referenceToKey(`${u("image-a.jpg")}#x`, BIZ)).toBe(k("image-a.jpg"));
    expect(referenceToKey(k("image-a.jpg"), BIZ)).toBe(k("image-a.jpg"));
  });

  it("rejects other businesses' objects and external URLs", () => {
    expect(referenceToKey(keyToPublicUrl("other/image-a.jpg"), BIZ)).toBe(null);
    expect(referenceToKey("https://example.com/a.jpg", BIZ)).toBe(null);
    expect(referenceToKey("/templates/olive/hero.jpg", BIZ)).toBe(null);
  });
});

describe("fileExtension", () => {
  it("keeps the key's extension, lowercased", () => {
    expect(fileExtension(k("image-a.JPG"))).toBe(".jpg");
    expect(fileExtension(k("testimonials/abc.webp"), "image/png")).toBe(
      ".webp",
    );
  });

  it("falls back to the content type when the key has none", () => {
    expect(fileExtension(k("image-a"), "image/png")).toBe(".png");
    expect(fileExtension(k("video-a"), "video/mp4; codecs=avc1")).toBe(".mp4");
    expect(fileExtension(k("image-a"), "application/x-unknown")).toBe("");
    expect(fileExtension(k("image-a"))).toBe("");
  });
});

describe("assignStoredPaths", () => {
  it("files each object under its first use, by category priority", () => {
    const objects = [
      obj("logo.png", "logo"),
      obj("image-a.jpg"),
      obj("image-b.png"),
      obj("gallery-c.jpg", "gallery"),
      obj("image-d.jpg"),
      obj("video-e.mp4", "video"),
      obj("library-f.webp"),
      obj("testimonials/g.jpg", "testimonial"),
      obj("image-h.jpg"),
    ];
    const refs: MediaReference[] = [
      // Gallery listed first, but Products outrank Galleries.
      {
        url: u("image-a.jpg"),
        category: "galleries",
        groupKey: "g1",
        groupName: "Summer",
      },
      {
        url: u("gallery-c.jpg"),
        category: "galleries",
        groupKey: "g1",
        groupName: "Summer",
      },
      {
        url: `${u("logo.png")}?v=2`,
        category: "branding",
        label: "Logo",
      },
      {
        url: u("image-a.jpg"),
        category: "products",
        groupKey: "p1",
        groupName: "Blue Mug / 12oz",
      },
      {
        url: k("image-b.png"),
        category: "products",
        groupKey: "p1",
        groupName: "Blue Mug / 12oz",
      },
      {
        url: u("testimonials/g.jpg"),
        category: "testimonials",
        groupKey: "t1",
        groupName: "Jane D.",
      },
      {
        url: u("image-h.jpg"),
        category: "siteSections",
        label: "Hero image",
      },
    ];

    const paths = assignStoredPaths(objects, refs, BIZ);

    expect(Object.fromEntries(paths)).toEqual({
      [k("logo.png")]: "Photos/Branding/Logo.png",
      [k("image-a.jpg")]: "Photos/Products/Blue Mug - 12oz/01.jpg",
      [k("image-b.png")]: "Photos/Products/Blue Mug - 12oz/02.png",
      // image-a was claimed by Products, so the gallery's own photo is 01.
      [k("gallery-c.jpg")]: "Photos/Galleries/Summer/01.jpg",
      [k("testimonials/g.jpg")]: "Photos/Testimonials/Jane D/01.jpg",
      [k("image-h.jpg")]: "Photos/Site sections/Hero image.jpg",
      // Unreferenced uploads.
      [k("image-d.jpg")]: "Photos/Media Library/image-d.jpg",
      [k("video-e.mp4")]: "Photos/Videos/video-e.mp4",
      [k("library-f.webp")]: "Photos/Media Library/library-f.webp",
    });
  });

  it("files product videos and posters in the Videos folder", () => {
    const objects = [
      obj("image-a.jpg"),
      obj("video-v.mp4", "video"),
      obj("image-p.jpg"),
    ];
    const refs: MediaReference[] = [
      {
        url: u("image-a.jpg"),
        category: "products",
        groupKey: "p1",
        groupName: "Blue Mug",
        isImageField: true,
      },
      { url: u("video-v.mp4"), category: "videos", label: "Blue Mug - video 1" },
      {
        url: u("image-p.jpg"),
        category: "videos",
        label: "Blue Mug - video 1 - poster",
        isImageField: true,
      },
    ];
    expect(Object.fromEntries(assignStoredPaths(objects, refs, BIZ))).toEqual({
      [k("image-a.jpg")]: "Photos/Products/Blue Mug/01.jpg",
      [k("video-v.mp4")]: "Photos/Videos/Blue Mug - video 1.mp4",
      [k("image-p.jpg")]: "Photos/Videos/Blue Mug - video 1 - poster.jpg",
    });
  });

  it("de-duplicates group folders and file names", () => {
    const objects = [
      obj("image-1.jpg"),
      obj("image-2.jpg"),
      obj("logo.png", "logo"),
      obj("logo.jpg", "logo"),
      obj("image-3.png"),
      obj("image-4.png"),
    ];
    const refs: MediaReference[] = [
      {
        url: u("image-1.jpg"),
        category: "products",
        groupKey: "p1",
        groupName: "Mug",
      },
      {
        url: u("image-2.jpg"),
        category: "products",
        groupKey: "p2",
        groupName: "mug",
      },
      { url: u("image-3.png"), category: "siteSections", label: "Banner" },
      { url: u("image-4.png"), category: "siteSections", label: "Banner" },
    ];
    const paths = assignStoredPaths(objects, refs, BIZ);
    expect(paths.get(k("image-1.jpg"))).toBe("Photos/Products/Mug/01.jpg");
    expect(paths.get(k("image-2.jpg"))).toBe("Photos/Products/mug (2)/01.jpg");
    // Unreferenced logo variants share the Branding folder.
    expect(paths.get(k("logo.png"))).toBe("Photos/Branding/Logo.png");
    expect(paths.get(k("logo.jpg"))).toBe("Photos/Branding/Logo.jpg");
    expect(paths.get(k("image-3.png"))).toBe("Photos/Site sections/Banner.png");
    expect(paths.get(k("image-4.png"))).toBe(
      "Photos/Site sections/Banner (2).png",
    );
  });

  it("uses the content type for extension-less keys and falls back for nameless groups", () => {
    const paths = assignStoredPaths(
      [obj("image-x", "image", "image/webp")],
      [{ url: u("image-x"), category: "blog", groupKey: "b1", groupName: "" }],
      BIZ,
    );
    expect(paths.get(k("image-x"))).toBe("Photos/Blog/Untitled/01.webp");
  });
});

describe("toExternalSource / planExternalImages", () => {
  it("classifies remote, protocol-relative and public/ paths", () => {
    expect(
      toExternalSource("https://cdn.example.com/a/b.JPG?w=800", BIZ),
    ).toEqual({
      type: "remote",
      fetchUrl: "https://cdn.example.com/a/b.JPG?w=800",
    });
    expect(toExternalSource("//cdn.example.com/x.png", BIZ)).toEqual({
      type: "remote",
      fetchUrl: "https://cdn.example.com/x.png",
    });
    expect(toExternalSource("/templates/olive/hero.jpg?v=1", BIZ)).toEqual({
      type: "public",
      relPath: "/templates/olive/hero.jpg",
    });
  });

  it("requires an image extension unless the field is image-typed", () => {
    expect(toExternalSource("https://images.example.com/photo/123", BIZ)).toBe(
      null,
    );
    expect(
      toExternalSource("https://images.example.com/photo/123", BIZ, true),
    ).toEqual({
      type: "remote",
      fetchUrl: "https://images.example.com/photo/123",
    });
    expect(toExternalSource("/shop", BIZ, true)).toBe(null);
    expect(toExternalSource("https://instagram.com/acme", BIZ)).toBe(null);
  });

  it("never treats stored keys, placeholders or data URIs as external", () => {
    expect(toExternalSource(u("image-a.jpg"), BIZ)).toBe(null);
    expect(toExternalSource(u("editor-notes/x.png"), BIZ)).toBe(null);
    expect(toExternalSource("/placeholder.svg", BIZ)).toBe(null);
    expect(toExternalSource("data:image/png;base64,AAAA", BIZ)).toBe(null);
  });

  it("dedupes by URL (ignoring query) and honours skipExternal", () => {
    const plan = planExternalImages(
      [
        {
          url: "https://x.com/a.jpg?w=1",
          category: "siteSections",
        },
        { url: "https://x.com/a.jpg", category: "products", groupKey: "p" },
        {
          url: "https://x.com/old.jpg",
          category: "siteSections",
          skipExternal: true,
        },
      ],
      BIZ,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]!.id).toBe("https://x.com/a.jpg");
    // Products outrank Site sections, so its form is listed first.
    expect(plan[0]!.raws).toEqual([
      "https://x.com/a.jpg",
      "https://x.com/a.jpg?w=1",
    ]);
  });
});

describe("collectJsonReferences", () => {
  it("finds TipTap image srcs, HTML img srcs and plain URL strings", () => {
    const found: Array<[string, boolean]> = [];
    collectJsonReferences(
      {
        doc: {
          type: "doc",
          content: [
            {
              type: "image",
              attrs: { src: "https://img.example.com/abc", alt: "A cat" },
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello world" }],
            },
          ],
        },
        html: '<p>Hi</p><img class="x" src="https://e.com/p.png">',
        cta: "/shop",
        rows: [{ photo: "https://e.com/no-ext" }],
        bareKey: k("image-z.jpg"),
      },
      BIZ,
      (url, isImage) => found.push([url, isImage]),
    );
    expect(found).toEqual([
      ["https://img.example.com/abc", true],
      ["https://e.com/p.png", true],
      ["/shop", false],
      ["https://e.com/no-ext", true],
      [k("image-z.jpg"), false],
    ]);
  });
});

describe("collectCustomFieldReferences", () => {
  const fields = [
    {
      key: "heroImage",
      label: "Hero image",
      description: "",
      page: "homepage",
      type: "image",
      defaultValue: "/templates/demo/hero.jpg",
    },
    {
      key: "aboutImage",
      label: "About photo",
      description: "",
      page: "about",
      type: "image",
      defaultValue: "/templates/demo/about.jpg",
    },
    {
      key: "featuredGallery",
      label: "Gallery",
      description: "",
      page: "homepage",
      type: "gallery",
    },
    {
      key: "team",
      label: "Team",
      description: "",
      page: "about",
      type: "list",
      itemSchema: [
        { key: "name", label: "Name", type: "text" },
        { key: "photo", label: "Photo", type: "image" },
      ],
      defaultsWhenEmpty: true,
      defaultRows: [{ name: "Ann", photo: "/templates/demo/ann.jpg" }],
    },
  ] as TemplateField[];

  it("labels saved values, uses defaults only for unset fields, skips gallery ids", () => {
    const refs = collectCustomFieldReferences(
      {
        heroImage: u("image-hero.jpg"),
        featuredGallery: "/looks-like-a-path.jpg",
        retiredKey: "https://e.com/old.jpg",
      },
      fields,
      BIZ,
    );
    expect(refs).toEqual([
      {
        url: u("image-hero.jpg"),
        category: "siteSections",
        label: "Hero image",
        isImageField: true,
        skipExternal: false,
      },
      {
        url: "https://e.com/old.jpg",
        category: "siteSections",
        label: undefined,
        isImageField: false,
        skipExternal: true,
      },
      {
        url: "/templates/demo/about.jpg",
        category: "siteSections",
        label: "About photo",
        isImageField: true,
      },
      {
        url: "/templates/demo/ann.jpg",
        category: "siteSections",
        label: "Team",
        isImageField: true,
      },
    ]);
  });
});

// ─── buildMediaIndex (mocked DB / S3 / network) ───────────────────────────────

function listed(suffix: string, kind: MediaKind = "image"): ListedObject {
  return {
    key: k(suffix),
    url: u(suffix),
    size: 10,
    lastModified: new Date("2026-10-01T00:00:00Z"),
    kind,
  };
}

describe("buildMediaIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(mocks.db)) {
      for (const fn of Object.values(model)) {
        (fn as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      }
    }
    mocks.db.business.findUnique.mockResolvedValue({
      templateId: "no-such-template",
      maintenanceImage: null,
      maintenanceMessage: null,
    });
    mocks.db.siteContent.findUnique.mockResolvedValue({
      logoUrl: `${u("logo.png")}?v=9`,
      faviconUrl: null,
      ogImage: null,
      heroImageUrl: null,
      aboutImageUrl: null,
      pageMeta: null,
      popupConfig: null,
      customFields: null,
    });
    mocks.db.product.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "Blue Mug",
        ogImage: null,
        description: null,
        additionalFields: null,
        images: [{ url: u("image-a.jpg") }, { url: `${u("image-b")}?t=1` }],
        variants: [{ imageUrl: null }],
      },
    ]);
    mocks.db.page.findMany.mockResolvedValue([
      {
        id: "post1",
        title: "Spring News",
        type: "blog",
        image: "https://stock.example.com/spring.jpg",
        ogImage: null,
        content: {
          type: "doc",
          content: [
            { type: "image", attrs: { src: u("editor-notes/shot.png") } },
            { type: "image", attrs: { src: "/facebook.svg" } },
            { type: "image", attrs: { src: "/..%2F..%2Fpackage.json.png" } },
            { type: "image", attrs: { src: "https://down.example.com/x.png" } },
          ],
        },
      },
    ]);

    const objects = [
      listed("logo.png", "logo"),
      listed("image-a.jpg"),
      listed("image-b"),
      listed("library-unused.jpg"),
      listed("image-broken.jpg"),
    ];
    mocks.listBusinessObjects.mockResolvedValue(objects);
    mocks.downloadStoredObjects.mockImplementation(
      async (
        objs: ListedObject[],
        _c: number,
        onProgress?: (d: number, t: number) => void,
      ): Promise<DownloadedObject[]> =>
        objs.map((o, i) => {
          onProgress?.(i + 1, objs.length);
          if (o.key.endsWith("image-broken.jpg"))
            return { obj: o, buffer: null };
          return {
            obj: o,
            buffer: new Uint8Array([i]).buffer,
            ...(o.key.endsWith("image-b") ? { contentType: "image/png" } : {}),
          };
        }),
    );
    mocks.safeFetch.mockImplementation(async (url: string) => {
      if (url.includes("down.example.com")) throw new Error("boom");
      return { bytes: Buffer.from([1, 2, 3]), contentType: "image/jpeg" };
    });
  });

  it("builds files, byUrl and stats", async () => {
    const progress: Array<[number, number]> = [];
    const media = await buildMediaIndex(BIZ, {
      onProgress: (d, t) => progress.push([d, t]),
    });

    expect(media.files.map((f) => f.path).sort()).toEqual(
      [
        "Photos/Branding/Logo.png",
        "Photos/Media Library/library-unused.jpg",
        "Photos/Products/Blue Mug/01.jpg",
        "Photos/Products/Blue Mug/02.png",
        "Photos/Template & stock images/facebook.svg",
        "Photos/Template & stock images/spring.jpg",
      ].sort(),
    );
    expect(media.files.every((f) => f.compress === false)).toBe(true);

    // Every reference form resolves.
    expect(media.byUrl.get(u("logo.png"))).toBe("Photos/Branding/Logo.png");
    expect(media.byUrl.get(`${u("logo.png")}?v=9`)).toBe(
      "Photos/Branding/Logo.png",
    );
    expect(media.byUrl.get(k("logo.png"))).toBe("Photos/Branding/Logo.png");
    expect(media.byUrl.get(`${u("image-b")}?t=1`)).toBe(
      "Photos/Products/Blue Mug/02.png",
    );
    expect(media.byUrl.get("https://stock.example.com/spring.jpg")).toBe(
      "Photos/Template & stock images/spring.jpg",
    );
    // Template defaults served from public/ are read from disk.
    expect(media.byUrl.get("/facebook.svg")).toBe(
      "Photos/Template & stock images/facebook.svg",
    );

    // Editor-note attachments are never exported or fetched.
    expect([...media.byUrl.values()].some((p) => p.includes("editor"))).toBe(
      false,
    );
    expect(
      mocks.safeFetch.mock.calls.some(([url]) =>
        String(url).includes("editor-notes"),
      ),
    ).toBe(false);

    expect(media.stats).toEqual({
      listed: 5,
      included: 4,
      missing: [k("image-broken.jpg")],
      external: [
        {
          url: "https://stock.example.com/spring.jpg",
          zipPath: "Photos/Template & stock images/spring.jpg",
        },
        {
          url: "/facebook.svg",
          zipPath: "Photos/Template & stock images/facebook.svg",
        },
        { url: "/..%2F..%2Fpackage.json.png", zipPath: null },
        { url: "https://down.example.com/x.png", zipPath: null },
      ],
    });
    expect(progress.at(-1)).toEqual([9, 9]);
  });
});
