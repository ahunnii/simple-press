/**
 * Transport-layer tests for the QuickBooks integration: `qboRequest`,
 * `qboQuery`, and the `getValidAccessToken` token lifecycle underneath them.
 *
 * No database and no network — `fetch` is stubbed globally and `db` is a
 * two-method fake over an in-memory row. What these tests actually protect is
 * a set of behaviours whose failures are silent in production and expensive:
 *
 *  - the ROTATED refresh token being persisted on every refresh (drop one and
 *    the connection is stranded until the owner re-authorizes);
 *  - the single-flight guard, without which N parallel calls on an expired
 *    token start N refreshes and race Intuit's rotation;
 *  - the 401 retry firing exactly once (a loop here would hammer Intuit);
 *  - `invalid_grant` — and ONLY `invalid_grant`-class rejections — flipping the
 *    row to `needs_reconnect`.
 *
 * `server-only` needs no `vi.mock` here: `vitest.config.ts` aliases it to
 * `tests/helpers/empty-module.ts` for every project, which is how the rest of
 * the repo imports server modules into the node test runtime (see the note in
 * `src/lib/geo/zip-lookup.test.ts`).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DbClient } from "~/server/db";
import { QBO_API_BASE, QBO_TOKEN_URL } from "~/lib/quickbooks/constants";
import {
  QboApiError,
  QboNeedsReconnectError,
  QboNotConnectedError,
  QboOAuthError,
} from "~/lib/quickbooks/errors";

vi.mock("~/env", () => ({
  env: {
    QBO_CLIENT_ID: "id",
    QBO_CLIENT_SECRET: "secret",
    QBO_ENVIRONMENT: "sandbox",
    NODE_ENV: "test",
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const Sentry = await import("@sentry/nextjs");
const captureException = vi.mocked(Sentry.captureException);

const { qboQuery, qboRequest } = await import("~/lib/quickbooks/client");
const { getValidAccessToken } = await import("~/lib/quickbooks/tokens");

// ── fixtures ────────────────────────────────────────────────────────────────

const EXPECTED_BASIC = `Basic ${Buffer.from("id:secret", "utf8").toString("base64")}`;
const SANDBOX = QBO_API_BASE.sandbox;

type ConnectionRow = {
  status: string;
  realmId: string;
  environment: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  lastRefreshAt: Date | null;
};

function row(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    status: "active",
    realmId: "realm-1",
    environment: "sandbox",
    accessToken: "stored-access",
    refreshToken: "stored-refresh",
    // Comfortably outside QBO_ACCESS_TOKEN_SKEW_MS.
    accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
    refreshTokenExpiresAt: new Date(Date.now() + 8_640_000_000),
    lastRefreshAt: null,
    ...overrides,
  };
}

/** An access token already past expiry — the refresh path's trigger. */
const EXPIRED = new Date(Date.now() - 60_000);

function makeDb(initial: ConnectionRow | null) {
  const state: { row: ConnectionRow | null } = { row: initial };

  const findUnique = vi.fn(() => Promise.resolve(state.row));
  const update = vi.fn((args: { data: Partial<ConnectionRow> }) => {
    state.row = { ...state.row!, ...args.data };
    return Promise.resolve(state.row);
  });

  return {
    db: { quickBooksConnection: { findUnique, update } } as unknown as DbClient,
    findUnique,
    update,
    state,
  };
}

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A successful Intuit token grant, with the refresh token deliberately rotated to a NEW value. */
function tokenGrantResponse(): Response {
  return jsonResponse(200, {
    access_token: "new-access",
    refresh_token: "rotated-refresh",
    expires_in: 3600,
    x_refresh_token_expires_in: 8_726_400,
    token_type: "bearer",
  });
}

/**
 * Narrows `captureException`'s second argument for assertion.
 *
 * Sentry types it as `ExclusiveEventHintOrCaptureContext` — a union wide enough
 * that TS refuses `.tags`/`.extra` on it even though the `{ tags, extra }`
 * member is the one every caller in this repo passes. Taking `unknown` here
 * keeps the cast in one place instead of at each assertion.
 */
function captureHint(hint: unknown): {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
} {
  return (hint ?? {}) as {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  };
}

/** `fetch`'s first arg can be a string, a `URL`, or a `Request`; only the last needs unwrapping. */
function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function callAt(index: number) {
  const call = fetchMock.mock.calls[index];
  if (!call) throw new Error(`expected a fetch call at index ${index}`);

  const [input, init] = call;
  return {
    url: requestUrl(input),
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
    body: typeof init?.body === "string" ? init.body : "",
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  captureException.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

// ── tests ───────────────────────────────────────────────────────────────────

describe("qboRequest — token still fresh", () => {
  it("uses the stored token without refreshing", async () => {
    const { db, update } = makeDb(row());
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { Invoice: { Id: "7" } }),
    );

    const result = await qboRequest<{ Invoice: { Id: string } }>(
      db,
      "biz-fresh",
      { path: "/invoice/7" },
    );

    expect(result.Invoice.Id).toBe("7");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();

    const api = callAt(0);
    expect(api.url).toContain(`${SANDBOX}/v3/company/realm-1/invoice/7`);
    expect(api.url).toContain("minorversion=");
    expect(api.headers.get("Authorization")).toBe("Bearer stored-access");
    expect(api.headers.get("Accept")).toBe("application/json");
  });
});

describe("qboRequest — expired token", () => {
  it("refreshes, persists the rotated refresh token, then calls the API", async () => {
    const { db, update, state } = makeDb(
      row({ accessTokenExpiresAt: EXPIRED }),
    );

    fetchMock
      .mockResolvedValueOnce(tokenGrantResponse())
      .mockResolvedValueOnce(jsonResponse(200, { Invoice: { Id: "9" } }));

    const result = await qboRequest<{ Invoice: { Id: string } }>(
      db,
      "biz-expired",
      { path: "/invoice/9" },
    );

    expect(result.Invoice.Id).toBe("9");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const grant = callAt(0);
    expect(grant.url).toBe(QBO_TOKEN_URL);
    expect(grant.method).toBe("POST");
    expect(grant.headers.get("Authorization")).toBe(EXPECTED_BASIC);
    expect(grant.headers.get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );

    const form = new URLSearchParams(grant.body);
    expect(form.get("grant_type")).toBe("refresh_token");
    expect(form.get("refresh_token")).toBe("stored-refresh");

    // The whole point: the NEW refresh token is written, not the one we sent.
    expect(update).toHaveBeenCalledTimes(1);
    const written = update.mock.calls[0]?.[0].data;
    expect(written?.accessToken).toBe("new-access");
    expect(written?.refreshToken).toBe("rotated-refresh");
    expect(written?.accessTokenExpiresAt).toBeInstanceOf(Date);
    expect(written?.refreshTokenExpiresAt).toBeInstanceOf(Date);
    expect(written?.lastRefreshAt).toBeInstanceOf(Date);
    expect(state.row?.refreshToken).toBe("rotated-refresh");

    expect(callAt(1).headers.get("Authorization")).toBe("Bearer new-access");
  });
});

describe("qboRequest — 401 handling", () => {
  it("force-refreshes and retries exactly once", async () => {
    const { db, update } = makeDb(row());

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(tokenGrantResponse())
      .mockResolvedValueOnce(jsonResponse(200, { Invoice: { Id: "3" } }));

    const result = await qboRequest<{ Invoice: { Id: string } }>(
      db,
      "biz-401-once",
      { path: "/invoice/3" },
    );

    expect(result.Invoice.Id).toBe("3");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(callAt(1).url).toBe(QBO_TOKEN_URL);
    expect(callAt(2).headers.get("Authorization")).toBe("Bearer new-access");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("throws QboApiError on a second 401 without refreshing again", async () => {
    const { db } = makeDb(row());

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(tokenGrantResponse())
      .mockResolvedValueOnce(jsonResponse(401, {}));

    await expect(
      qboRequest(db, "biz-401-twice", { path: "/invoice/3" }),
    ).rejects.toBeInstanceOf(QboApiError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const grantCalls = fetchMock.mock.calls.filter(
      ([input]) => requestUrl(input) === QBO_TOKEN_URL,
    );
    expect(grantCalls).toHaveLength(1);
  });
});

describe("getValidAccessToken — refresh rejected by Intuit", () => {
  it("marks the connection needs_reconnect, reports, and throws", async () => {
    const { db, update } = makeDb(row({ accessTokenExpiresAt: EXPIRED }));

    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "invalid_grant" }),
    );

    await expect(
      getValidAccessToken(db, "biz-invalid-grant"),
    ).rejects.toBeInstanceOf(QboNeedsReconnectError);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { businessId: "biz-invalid-grant" },
      data: { status: "needs_reconnect" },
    });

    expect(captureException).toHaveBeenCalledTimes(1);
    // The OAuth error itself must be what's reported — capturing the
    // QboNeedsReconnectError thrown in its place would drop Intuit's code,
    // which is the only clue distinguishing a revoked grant from a rotated one.
    expect(captureException.mock.calls[0]?.[0]).toBeInstanceOf(QboOAuthError);

    const hint = captureHint(captureException.mock.calls[0]?.[1]);
    expect(hint.tags).toMatchObject({
      service: "quickbooks",
      "quickbooks.step": "token-refresh",
      businessId: "biz-invalid-grant",
    });
    expect(hint.extra).toMatchObject({ code: "invalid_grant" });
  });
});

describe("getValidAccessToken — single flight", () => {
  it("coalesces concurrent refreshes into one token request", async () => {
    const { db, update } = makeDb(row({ accessTokenExpiresAt: EXPIRED }));
    fetchMock.mockResolvedValue(tokenGrantResponse());

    const [first, second] = await Promise.all([
      getValidAccessToken(db, "biz-concurrent"),
      getValidAccessToken(db, "biz-concurrent"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(first.accessToken).toBe("new-access");
    expect(second.accessToken).toBe("new-access");
    expect(first.realmId).toBe("realm-1");
    expect(first.environment).toBe("sandbox");
  });
});

describe("getValidAccessToken — unusable connections", () => {
  it("throws QboNotConnectedError when there is no row", async () => {
    const { db } = makeDb(null);
    await expect(getValidAccessToken(db, "biz-none")).rejects.toBeInstanceOf(
      QboNotConnectedError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws QboNotConnectedError for a disconnected row", async () => {
    const { db } = makeDb(row({ status: "disconnected" }));
    await expect(
      getValidAccessToken(db, "biz-disconnected"),
    ).rejects.toBeInstanceOf(QboNotConnectedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws QboNeedsReconnectError for a needs_reconnect row", async () => {
    const { db } = makeDb(row({ status: "needs_reconnect" }));
    await expect(
      getValidAccessToken(db, "biz-needs-reconnect"),
    ).rejects.toBeInstanceOf(QboNeedsReconnectError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("qboQuery", () => {
  it("sends the SQL as a query param and returns the entity rows", async () => {
    const { db } = makeDb(row());
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        QueryResponse: {
          Invoice: [{ Id: "1" }, { Id: "2" }],
          startPosition: 1,
          maxResults: 2,
        },
      }),
    );

    const sql = "SELECT * FROM Invoice WHERE Id IN ('1','2')";
    const rows = await qboQuery<{ Id: string }>(
      db,
      "biz-query",
      "Invoice",
      sql,
    );

    expect(rows.map((r) => r.Id)).toEqual(["1", "2"]);

    const call = callAt(0);
    const url = new URL(call.url);
    expect(url.pathname).toBe("/v3/company/realm-1/query");
    expect(url.searchParams.get("query")).toBe(sql);
    expect(url.searchParams.get("minorversion")).toBeTruthy();
    expect(call.method).toBe("GET");
  });

  it("returns [] when the entity key is absent", async () => {
    const { db } = makeDb(row());
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { QueryResponse: {} }));

    await expect(
      qboQuery(db, "biz-query-empty", "Invoice", "SELECT * FROM Invoice"),
    ).resolves.toEqual([]);
  });
});

describe("qboRequest — Intuit Fault bodies", () => {
  it("surfaces the fault message and code on a QboApiError", async () => {
    const { db } = makeDb(row());
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        Fault: {
          type: "ValidationFault",
          Error: [
            {
              Message: "Duplicate Document Number Error",
              Detail: "Duplicate Document Number Error : DocNumber=1001",
              code: "6140",
            },
          ],
        },
      }),
    );

    const err = await qboRequest(db, "biz-fault", {
      method: "POST",
      path: "/invoice",
      body: { DocNumber: "1001" },
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(QboApiError);
    const apiError = err as QboApiError;
    expect(apiError.message).toBe("Duplicate Document Number Error");
    expect(apiError.code).toBe("6140");
    expect(apiError.detail).toContain("DocNumber=1001");
    expect(apiError.status).toBe(400);
    // ValidationFault ⇒ the owner can fix it, so it reports as BAD_REQUEST.
    expect(apiError.ownerFixable).toBe(true);

    const call = callAt(0);
    expect(call.method).toBe("POST");
    expect(call.headers.get("Content-Type")).toBe("application/json");
    expect(call.body).toBe(JSON.stringify({ DocNumber: "1001" }));
  });
});
