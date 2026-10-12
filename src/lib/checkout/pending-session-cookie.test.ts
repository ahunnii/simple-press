import { describe, expect, it } from "vitest";

import {
  legacyBareCookieAllowed,
  matchPendingSessionCookie,
  readPendingSessionId,
  signPendingSessionCookie,
  SUBSCRIPTION_PENDING_COOKIE,
  withinLegacyCookieAge,
} from "./pending-session-cookie";

const BIZ = "biz_1";
const SESSION = "cs_test_abc123";

function headers(cookie?: string) {
  return new Headers(cookie ? { cookie } : {});
}

describe("pending_session cookie", () => {
  it("round-trips a signed value for the same business", () => {
    const value = signPendingSessionCookie(SESSION, BIZ);
    expect(value).toMatch(/^cs_test_abc123\.[A-Za-z0-9_-]{43}$/);
    expect(
      readPendingSessionId(headers(`a=1; pending_session=${value}`), BIZ),
    ).toBe(SESSION);
  });

  it("accepts a percent-encoded value", () => {
    const value = encodeURIComponent(signPendingSessionCookie(SESSION, BIZ));
    expect(readPendingSessionId(headers(`pending_session=${value}`), BIZ)).toBe(
      SESSION,
    );
  });

  it("rejects an unsigned value", () => {
    const h = headers(`pending_session=${SESSION}`);
    expect(readPendingSessionId(h, BIZ)).toBeNull();
  });

  it("rejects a tampered signature, another business, another session id", () => {
    const value = signPendingSessionCookie(SESSION, BIZ);
    const sig = value.slice(value.lastIndexOf(".") + 1);
    const flipped = `${SESSION}.${sig.startsWith("A") ? "B" : "A"}${sig.slice(1)}`;
    for (const bad of [
      flipped,
      `${SESSION}.${sig}x`,
      `${SESSION}.`,
      signPendingSessionCookie(SESSION, "biz_2"),
      `cs_test_other.${sig}`,
      signPendingSessionCookie(SESSION, BIZ, { secret: "another-secret" }),
    ]) {
      expect(
        readPendingSessionId(headers(`pending_session=${bad}`), BIZ),
      ).toBeNull();
      expect(
        matchPendingSessionCookie(
          headers(`pending_session=${bad}`),
          BIZ,
          SESSION,
        ),
      ).toBeNull();
    }
  });

  it("ignores garbage and absent cookies", () => {
    expect(readPendingSessionId(headers(), BIZ)).toBeNull();
    expect(
      readPendingSessionId(headers("pending_session=%ZZ"), BIZ),
    ).toBeNull();
    expect(
      readPendingSessionId(headers("pending_session=not-a-session"), BIZ),
    ).toBeNull();
    expect(
      matchPendingSessionCookie(
        headers("xpending_session=cs_test_abc123"),
        BIZ,
        SESSION,
      ),
    ).toBeNull();
  });

  it("uses the first valid value when the header carries several", () => {
    const value = signPendingSessionCookie(SESSION, BIZ);
    expect(
      readPendingSessionId(
        headers(`pending_session=cs_test_forged; pending_session=${value}`),
        BIZ,
      ),
    ).toBe(SESSION);
  });
});

describe("matchPendingSessionCookie", () => {
  const signed = signPendingSessionCookie(SESSION, BIZ);

  it("reports a verified signed value", () => {
    expect(
      matchPendingSessionCookie(
        headers(`pending_session=${signed}`),
        BIZ,
        SESSION,
      ),
    ).toEqual({ sessionId: SESSION, signed: true });
  });

  it("reports a bare value equal to the session as unsigned", () => {
    expect(
      matchPendingSessionCookie(
        headers(`pending_session=${SESSION}`),
        BIZ,
        SESSION,
      ),
    ).toEqual({ sessionId: SESSION, signed: false });
  });

  it("a signed cookie for another session does not shadow a bare one for this session", () => {
    const other = signPendingSessionCookie("cs_test_other", BIZ);
    expect(
      matchPendingSessionCookie(
        headers(`pending_session=${other}; pending_session=${SESSION}`),
        BIZ,
        SESSION,
      ),
    ).toEqual({ sessionId: SESSION, signed: false });
  });

  it("prefers a signed match over a bare one", () => {
    expect(
      matchPendingSessionCookie(
        headers(`pending_session=${SESSION}; pending_session=${signed}`),
        BIZ,
        SESSION,
      ),
    ).toEqual({ sessionId: SESSION, signed: true });
  });

  it("returns null when no value names the session", () => {
    expect(
      matchPendingSessionCookie(
        headers("pending_session=cs_test_x"),
        BIZ,
        SESSION,
      ),
    ).toBeNull();
    expect(matchPendingSessionCookie(headers(), BIZ, SESSION)).toBeNull();
  });
});

describe("pending_subscription_session cookie", () => {
  const sub = { kind: SUBSCRIPTION_PENDING_COOKIE };
  const signed = signPendingSessionCookie(SESSION, BIZ, sub);

  it("round-trips under its own cookie name", () => {
    expect(
      matchPendingSessionCookie(
        headers(`pending_subscription_session=${signed}`),
        BIZ,
        SESSION,
        sub,
      ),
    ).toEqual({ sessionId: SESSION, signed: true });
    expect(
      readPendingSessionId(
        headers(`pending_subscription_session=${signed}`),
        BIZ,
        sub,
      ),
    ).toBe(SESSION);
  });

  it("signs with a distinct context: the two cookies can't be swapped", () => {
    const oneTime = signPendingSessionCookie(SESSION, BIZ);
    expect(signed).not.toBe(oneTime);
    // A one-time value placed in the subscription cookie…
    expect(
      matchPendingSessionCookie(
        headers(`pending_subscription_session=${oneTime}`),
        BIZ,
        SESSION,
        sub,
      ),
    ).toBeNull();
    // …and a subscription value placed in the one-time cookie.
    expect(
      readPendingSessionId(headers(`pending_session=${signed}`), BIZ),
    ).toBeNull();
  });

  it("reads only its own cookie name", () => {
    expect(
      matchPendingSessionCookie(
        headers(`pending_session=${signed}`),
        BIZ,
        SESSION,
        sub,
      ),
    ).toBeNull();
    expect(
      matchPendingSessionCookie(
        headers(`pending_session=${SESSION}`),
        BIZ,
        SESSION,
        sub,
      ),
    ).toBeNull();
  });

  it("rejects another store's value; reports a bare value as unsigned", () => {
    const otherStore = signPendingSessionCookie(SESSION, "biz_2", sub);
    expect(
      matchPendingSessionCookie(
        headers(`pending_subscription_session=${otherStore}`),
        BIZ,
        SESSION,
        sub,
      ),
    ).toBeNull();
    expect(
      matchPendingSessionCookie(
        headers(`pending_subscription_session=${SESSION}`),
        BIZ,
        SESSION,
        sub,
      ),
    ).toEqual({ sessionId: SESSION, signed: false });
  });
});

describe("legacyBareCookieAllowed", () => {
  const now = 1_800_000_000_000;
  const window = (3600 + 15 * 60) * 1000;

  it("allows an unmarked session inside the cookie's lifetime + slack", () => {
    expect(
      legacyBareCookieAllowed(
        { created: (now - window) / 1000, metadata: {} },
        now,
      ),
    ).toBe(true);
  });

  it("refuses a marked session, an old one, or a missing created time", () => {
    expect(
      legacyBareCookieAllowed(
        { created: now / 1000, metadata: { pendingCookie: "signed-v1" } },
        now,
      ),
    ).toBe(false);
    expect(
      legacyBareCookieAllowed(
        { created: (now - window - 1000) / 1000, metadata: null },
        now,
      ),
    ).toBe(false);
    expect(withinLegacyCookieAge(Number.NaN, now)).toBe(false);
  });
});
