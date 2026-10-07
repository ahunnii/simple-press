import { beforeEach, describe, expect, it, vi } from "vitest";

let mockEnv: {
  INDEXNOW_KEY?: string;
  IS_PREVIEW_ENV: boolean;
  NODE_ENV: string;
  NEXT_PUBLIC_PLATFORM_DOMAIN: string;
};

vi.mock("~/env", () => ({
  get env() {
    return mockEnv;
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const Sentry = await import("@sentry/nextjs");
const mockCaptureMessage = vi.mocked(Sentry.captureMessage);
const mockCaptureException = vi.mocked(Sentry.captureException);

const { INDEXNOW_ENDPOINT, runIndexNowSweep, submitIndexNow } =
  await import("./indexnow");

type Db = Parameters<typeof runIndexNowSweep>[0];

// ── fixtures ────────────────────────────────────────────────────────────────

const SWEEP_START = new Date("2026-10-07T12:00:00.000Z");
const SINCE = new Date("2026-10-07T11:00:00.000Z");
const OLD = new Date("2026-10-01T00:00:00.000Z");

type BusinessRow = {
  id: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string | null;
  featureFlags: unknown;
  updatedAt: Date;
  indexNowSubmittedAt: Date | null;
  indexNowHost: string | null;
};

function makeBusiness(overrides: Partial<BusinessRow> = {}): BusinessRow {
  return {
    id: "biz_1",
    subdomain: "acme",
    customDomain: null,
    domainStatus: null,
    featureFlags: null,
    updatedAt: OLD,
    indexNowSubmittedAt: SINCE,
    indexNowHost: "acme.simplepress.co",
    ...overrides,
  };
}

/**
 * A mock db whose per-row queries honour an `updatedAt: { gt }` filter, so the
 * same fixture answers both the seed (no filter) and incremental queries.
 */
function makeDb(businesses: BusinessRow[]) {
  const recent = new Date("2026-10-07T11:30:00.000Z");
  const products = [
    { slug: "old-mug", updatedAt: OLD },
    { slug: "new-mug", updatedAt: recent },
  ];
  const pages = [
    { slug: "terms", type: "policy", updatedAt: OLD },
    { slug: "fresh-post", type: "blog", updatedAt: recent },
  ];

  const filterRows = <T extends { updatedAt: Date }>(
    rows: T[],
    args: { where: { updatedAt?: { gt: Date } } },
  ) => {
    const gt = args.where.updatedAt?.gt;
    return Promise.resolve(gt ? rows.filter((r) => r.updatedAt > gt) : rows);
  };

  const db = {
    business: { findMany: vi.fn().mockResolvedValue(businesses) },
    product: {
      findMany: vi.fn((args: { where: { updatedAt?: { gt: Date } } }) =>
        filterRows(products, args),
      ),
    },
    collection: { findMany: vi.fn().mockResolvedValue([]) },
    page: {
      findMany: vi.fn((args: { where: { updatedAt?: { gt: Date } } }) =>
        filterRows(pages, args),
      ),
    },
    service: { findMany: vi.fn().mockResolvedValue([]) },
    event: { findMany: vi.fn().mockResolvedValue([]) },
    faqItem: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    testimonial: { findFirst: vi.fn().mockResolvedValue(null) },
    video: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    siteContent: {
      findUnique: vi.fn().mockResolvedValue({ updatedAt: OLD }),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  return db;
}

function asDb(db: ReturnType<typeof makeDb>): Db {
  return db as unknown as Db;
}

function makeFetch(...statuses: number[]) {
  const fn = vi.fn();
  for (const status of statuses) {
    fn.mockResolvedValueOnce(new Response(null, { status }));
  }
  return fn;
}

function sentBody(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const init = fetchImpl.mock.calls[call]![1] as RequestInit;
  return JSON.parse(init.body as string) as {
    host: string;
    key: string;
    keyLocation: string;
    urlList: string[];
  };
}

/** `$executeRaw` is a tagged template: [strings, ...values]. */
function rawValues(db: ReturnType<typeof makeDb>, call = 0) {
  return (db.$executeRaw.mock.calls[call] as unknown[]).slice(1);
}

const now = () => SWEEP_START;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv = {
    INDEXNOW_KEY: "test-indexnow-key-123",
    IS_PREVIEW_ENV: false,
    NODE_ENV: "production",
    NEXT_PUBLIC_PLATFORM_DOMAIN: "simplepress.co",
  };
});

// ── submitIndexNow ──────────────────────────────────────────────────────────

describe("submitIndexNow", () => {
  it("POSTs the IndexNow JSON payload with a timeout and returns the status", async () => {
    const fetchImpl = makeFetch(202);
    const res = await submitIndexNow(
      { fetchImpl, key: "k-12345678" },
      {
        host: "acme.simplepress.co",
        keyLocation: "https://acme.simplepress.co/indexnow-key.txt",
        urlList: ["https://acme.simplepress.co/shop"],
      },
    );

    expect(res).toEqual({ status: 202 });
    expect(fetchImpl).toHaveBeenCalledWith(
      INDEXNOW_ENDPOINT,
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(sentBody(fetchImpl)).toEqual({
      host: "acme.simplepress.co",
      key: "k-12345678",
      keyLocation: "https://acme.simplepress.co/indexnow-key.txt",
      urlList: ["https://acme.simplepress.co/shop"],
    });
  });
});

// ── runIndexNowSweep ────────────────────────────────────────────────────────

describe("runIndexNowSweep gates", () => {
  it.each([
    ["INDEXNOW_KEY is unset", { INDEXNOW_KEY: undefined }],
    ["running on a preview env", { IS_PREVIEW_ENV: true }],
    ["NODE_ENV is not production", { NODE_ENV: "development" }],
  ])("does nothing when %s", async (_label, override) => {
    mockEnv = { ...mockEnv, ...override };
    const db = makeDb([makeBusiness()]);
    const fetchImpl = makeFetch(200);

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(0);
    expect(db.business.findMany).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });
});

describe("runIndexNowSweep", () => {
  it("selects active, non-maintenance stores, oldest watermark first", async () => {
    const db = makeDb([]);
    await runIndexNowSweep(asDb(db), { fetchImpl: makeFetch(), now });

    expect(db.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active", maintenanceMode: false },
        orderBy: { indexNowSubmittedAt: { sort: "asc", nulls: "first" } },
        take: 25,
      }),
    );
  });

  it("seeds the full sitemap when the watermark is null", async () => {
    const db = makeDb([
      makeBusiness({ indexNowSubmittedAt: null, indexNowHost: null }),
    ]);
    const fetchImpl = makeFetch(200);

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(1);
    const body = sentBody(fetchImpl);
    expect(body.host).toBe("acme.simplepress.co");
    expect(body.key).toBe("test-indexnow-key-123");
    expect(body.keyLocation).toBe(
      "https://acme.simplepress.co/indexnow-key.txt",
    );
    // Full sitemap: unchanged rows included, home included.
    expect(body.urlList).toContain("https://acme.simplepress.co");
    expect(body.urlList).toContain("https://acme.simplepress.co/shop/old-mug");
    expect(body.urlList).toContain("https://acme.simplepress.co/shop/new-mug");
    expect(body.urlList).toContain("https://acme.simplepress.co/terms");
    // Seed queries carry no updatedAt filter.
    expect(db.product.findMany).toHaveBeenCalledWith({
      where: { businessId: "biz_1", published: true },
      select: { slug: true, updatedAt: true },
    });
  });

  it("submits only rows changed since the watermark (published only)", async () => {
    const db = makeDb([
      makeBusiness({ featureFlags: { blog: true, videos: true } }),
    ]);
    const fetchImpl = makeFetch(202);

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(1);
    expect(sentBody(fetchImpl).urlList).toEqual([
      "https://acme.simplepress.co/shop",
      "https://acme.simplepress.co/blog",
      "https://acme.simplepress.co/shop/new-mug",
      "https://acme.simplepress.co/blog/fresh-post",
    ]);
    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "biz_1",
          published: true,
          updatedAt: { gt: SINCE },
        },
      }),
    );
    expect(db.testimonial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "biz_1",
          isApproved: true,
          isHidden: false,
          updatedAt: { gt: SINCE },
        },
      }),
    );
    // Videos use createdAt — the YouTube sync touches updatedAt every run.
    expect(db.video.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "biz_1",
          published: true,
          createdAt: { gt: SINCE },
        },
      }),
    );
  });

  it("adds the homepage when site content or business details changed", async () => {
    const db = makeDb([
      makeBusiness({ updatedAt: new Date("2026-10-07T11:45:00.000Z") }),
    ]);
    const fetchImpl = makeFetch(200);

    await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(sentBody(fetchImpl).urlList[0]).toBe("https://acme.simplepress.co");
  });

  it("re-seeds when the canonical host changed", async () => {
    const db = makeDb([
      makeBusiness({
        customDomain: "acme.com",
        domainStatus: "ACTIVE",
        indexNowHost: "acme.simplepress.co",
      }),
    ]);
    const fetchImpl = makeFetch(200);

    await runIndexNowSweep(asDb(db), { fetchImpl, now });

    const body = sentBody(fetchImpl);
    expect(body.host).toBe("acme.com");
    expect(body.keyLocation).toBe("https://acme.com/indexnow-key.txt");
    expect(body.urlList).toContain("https://acme.com/shop/old-mug");
    expect(rawValues(db)).toEqual([SWEEP_START, "acme.com", "biz_1"]);
  });

  it("advances the watermark with raw SQL only after a 200/202", async () => {
    const db = makeDb([makeBusiness()]);
    const fetchImpl = vi.fn(() => {
      // The watermark must not move before the submission lands.
      expect(db.$executeRaw).not.toHaveBeenCalled();
      return Promise.resolve(new Response(null, { status: 200 }));
    });

    await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const [strings] = db.$executeRaw.mock.calls[0]! as [TemplateStringsArray];
    expect(strings.join("?")).toBe(
      'UPDATE "Business" SET "indexNowSubmittedAt" = ?, "indexNowHost" = ? WHERE "id" = ?',
    );
    expect(rawValues(db)).toEqual([
      SWEEP_START,
      "acme.simplepress.co",
      "biz_1",
    ]);
  });

  it("stops the sweep on 429 and reports once", async () => {
    const db = makeDb([
      makeBusiness({ id: "biz_1" }),
      makeBusiness({ id: "biz_2" }),
      makeBusiness({ id: "biz_3" }),
    ]);
    const fetchImpl = makeFetch(429, 200, 200);

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        tags: { "cron.job": "indexnow", status: "429" },
      }),
    );
  });

  it("stops the sweep on 403 after earlier stores advanced", async () => {
    const db = makeDb([
      makeBusiness({ id: "biz_1" }),
      makeBusiness({ id: "biz_2" }),
      makeBusiness({ id: "biz_3" }),
    ]);
    const fetchImpl = makeFetch(200, 403, 200);

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(rawValues(db)[2]).toBe("biz_1");
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        tags: { "cron.job": "indexnow", status: "403" },
      }),
    );
  });

  it("keeps the watermark on a 500 and moves on to the next store", async () => {
    const db = makeDb([
      makeBusiness({ id: "biz_1" }),
      makeBusiness({ id: "biz_2" }),
    ]);
    const fetchImpl = makeFetch(500, 200);

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(rawValues(db)[2]).toBe("biz_2");
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        level: "warning",
        tags: { "cron.job": "indexnow", status: "500" },
        extra: { businessId: "biz_1", host: "acme.simplepress.co", urls: 2 },
      }),
    );
  });

  it("keeps the watermark when the request throws and moves on", async () => {
    const db = makeDb([
      makeBusiness({ id: "biz_1" }),
      makeBusiness({ id: "biz_2" }),
    ]);
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(1);
    expect(rawValues(db)[2]).toBe("biz_2");
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        level: "warning",
        tags: { "cron.job": "indexnow" },
        extra: { businessId: "biz_1" },
      }),
    );
  });

  it("advances the watermark without submitting when nothing changed", async () => {
    const db = makeDb([makeBusiness()]);
    db.product.findMany.mockImplementation(() => Promise.resolve([]));
    db.page.findMany.mockImplementation(() => Promise.resolve([]));
    const fetchImpl = makeFetch();

    const result = await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(result).toBe(1);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rawValues(db)).toEqual([
      SWEEP_START,
      "acme.simplepress.co",
      "biz_1",
    ]);
  });

  it("skips flag-gated queries when the feature is off", async () => {
    const db = makeDb([
      makeBusiness({
        featureFlags: { products: false, testimonials: false, blog: true },
      }),
    ]);
    const fetchImpl = makeFetch(200);

    await runIndexNowSweep(asDb(db), { fetchImpl, now });

    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.testimonial.findFirst).not.toHaveBeenCalled();
    expect(sentBody(fetchImpl).urlList).toEqual([
      "https://acme.simplepress.co/blog",
      "https://acme.simplepress.co/blog/fresh-post",
    ]);
  });
});
