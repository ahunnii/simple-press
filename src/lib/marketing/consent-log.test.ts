import { describe, expect, it } from "vitest";

import { MARKETING_CONSENT_SOURCES } from "./consent";
import {
  clampConsentMeta,
  CONSENT_IP_MAX_LENGTH,
  CONSENT_USER_AGENT_MAX_LENGTH,
  consentRequestMeta,
  MARKETING_CONSENT_EVENT_SOURCE_LABELS,
  MARKETING_CONSENT_EVENT_SOURCES,
} from "./consent-log";

describe("clampConsentMeta", () => {
  it("trims, drops empties, and caps length", () => {
    expect(clampConsentMeta(undefined, 10)).toBeUndefined();
    expect(clampConsentMeta(null, 10)).toBeUndefined();
    expect(clampConsentMeta("   ", 10)).toBeUndefined();
    expect(clampConsentMeta("  abc  ", 10)).toBe("abc");
    expect(clampConsentMeta("x".repeat(20), 10)).toBe("x".repeat(10));
  });
});

describe("consentRequestMeta", () => {
  it("reads the client IP and user agent", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7",
      "user-agent": "Mozilla/5.0 Test",
    });
    expect(consentRequestMeta(headers)).toEqual({
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0 Test",
    });
  });

  it("omits an unknown IP and a missing user agent", () => {
    expect(consentRequestMeta(new Headers())).toEqual({});
  });

  it("truncates an oversized user agent and IP", () => {
    const headers = new Headers({
      "x-real-ip": "9".repeat(200),
      "user-agent": "a".repeat(5000),
    });
    const meta = consentRequestMeta(headers);
    expect(meta.ip).toHaveLength(CONSENT_IP_MAX_LENGTH);
    expect(meta.userAgent).toHaveLength(CONSENT_USER_AGENT_MAX_LENGTH);
  });
});

describe("MARKETING_CONSENT_EVENT_SOURCES", () => {
  it("includes every opt-in source and labels every value", () => {
    for (const s of MARKETING_CONSENT_SOURCES) {
      expect(MARKETING_CONSENT_EVENT_SOURCES).toContain(s);
    }
    expect(new Set(MARKETING_CONSENT_EVENT_SOURCES).size).toBe(
      MARKETING_CONSENT_EVENT_SOURCES.length,
    );
    for (const s of MARKETING_CONSENT_EVENT_SOURCES) {
      expect(MARKETING_CONSENT_EVENT_SOURCE_LABELS[s]).toBeTruthy();
    }
  });
});
