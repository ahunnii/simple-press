import { describe, expect, it } from "vitest";

import {
  buildCsp,
  CSP_REPORT_ONLY_HEADER,
  generateNonce,
  resolveStorageOrigin,
} from "./csp";

/** Pull one directive's full value out of a policy string. */
function getDirective(policy: string, name: string): string | undefined {
  return policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
}

const NONCE = "AAAAAAAAAAAAAAAAAAAAAA==";

describe("CSP_REPORT_ONLY_HEADER", () => {
  it("is the report-only header name", () => {
    expect(CSP_REPORT_ONLY_HEADER).toBe("Content-Security-Policy-Report-Only");
  });
});

describe("generateNonce", () => {
  it("returns 24 base64 characters (16 random bytes)", () => {
    const nonce = generateNonce();
    expect(nonce).toHaveLength(24);
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it("is unique across calls", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(nonces.size).toBe(200);
  });

  it("never contains characters Next rejects in a nonce", () => {
    // Next throws (E440) if the nonce it reads back contains HTML escape
    // characters; base64 output cannot, but assert it rather than assume it.
    for (let i = 0; i < 50; i++) {
      expect(generateNonce()).not.toMatch(/[&><"']/);
    }
  });
});

describe("resolveStorageOrigin", () => {
  it("adds https:// to a bare host (the production shape)", () => {
    expect(resolveStorageOrigin("storage.artisanalfutures.org")).toBe(
      "https://storage.artisanalfutures.org",
    );
  });

  it("keeps an explicit scheme and strips any path (the .env.example shape)", () => {
    expect(resolveStorageOrigin("http://localhost:9000")).toBe(
      "http://localhost:9000",
    );
    expect(resolveStorageOrigin("https://cdn.example.com/bucket/")).toBe(
      "https://cdn.example.com",
    );
  });

  it("returns null for unset, blank, or unparseable values", () => {
    expect(resolveStorageOrigin(undefined)).toBeNull();
    expect(resolveStorageOrigin(null)).toBeNull();
    expect(resolveStorageOrigin("   ")).toBeNull();
    expect(resolveStorageOrigin("https://")).toBeNull();
  });
});

describe("buildCsp", () => {
  const prod = (extra: Parameters<typeof buildCsp>[1] = {}) =>
    buildCsp(NONCE, {
      dev: false,
      preview: false,
      storageOrigin: null,
      platformDomain: null,
      ...extra,
    });

  it("carries the nonce and 'strict-dynamic' in script-src", () => {
    const scriptSrc = getDirective(prod(), "script-src");
    expect(scriptSrc).toContain(`'nonce-${NONCE}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it("keeps the CSP2 fallback script hosts (reCAPTCHA + Instagram)", () => {
    const scriptSrc = getDirective(prod(), "script-src") ?? "";
    expect(scriptSrc).toContain("https://www.google.com");
    expect(scriptSrc).toContain("https://www.gstatic.com");
    expect(scriptSrc).toContain("https://www.instagram.com");
  });

  it("never ships 'unsafe-eval' in production", () => {
    expect(prod()).not.toContain("'unsafe-eval'");
  });

  it("allows 'unsafe-eval' and localhost origins in dev only", () => {
    const devPolicy = buildCsp(NONCE, {
      dev: true,
      preview: false,
      storageOrigin: null,
      platformDomain: null,
    });
    expect(getDirective(devPolicy, "script-src")).toContain("'unsafe-eval'");
    expect(getDirective(devPolicy, "img-src")).toContain("http:");
    expect(getDirective(devPolicy, "connect-src")).toContain("ws:");
    expect(getDirective(devPolicy, "connect-src")).toContain(
      "http://localhost:*",
    );
    expect(getDirective(devPolicy, "frame-src")).toContain(
      "http://localhost:*",
    );
  });

  it("locks down object-src and base-uri", () => {
    const policy = prod();
    expect(getDirective(policy, "object-src")).toBe("object-src 'none'");
    expect(getDirective(policy, "base-uri")).toBe("base-uri 'self'");
  });

  it("keeps style-src 'unsafe-inline' (React style props / Next inline styles)", () => {
    expect(getDirective(prod(), "style-src")).toBe(
      "style-src 'self' 'unsafe-inline'",
    );
  });

  it("allows MapLibre blob workers and tile hosts", () => {
    const policy = prod();
    expect(getDirective(policy, "worker-src")).toContain("blob:");
    expect(getDirective(policy, "child-src")).toContain("blob:");
    const connectSrc = getDirective(policy, "connect-src") ?? "";
    expect(connectSrc).toContain("https://basemaps.cartocdn.com");
    expect(connectSrc).toContain("https://*.basemaps.cartocdn.com");
    expect(connectSrc).toContain("https://tiles.openfreemap.org");
  });

  it("allows the post-form redirect targets in form-action", () => {
    const formAction = getDirective(prod(), "form-action") ?? "";
    for (const host of [
      "'self'",
      "https://checkout.stripe.com",
      "https://billing.stripe.com",
      "https://connect.stripe.com",
      "https://appcenter.intuit.com",
      "https://discord.com",
    ]) {
      expect(formAction).toContain(host);
    }
  });

  it("includes the storage origin in font-src and connect-src when given", () => {
    const policy = prod({ storageOrigin: "https://storage.example.com" });
    expect(getDirective(policy, "font-src")).toContain(
      "https://storage.example.com",
    );
    expect(getDirective(policy, "connect-src")).toContain(
      "https://storage.example.com",
    );
  });

  it("omits the storage origin entirely when null", () => {
    const policy = prod({ storageOrigin: null });
    expect(policy).not.toContain("storage.example.com");
    expect(getDirective(policy, "font-src")).toBe("font-src 'self' data:");
  });

  it("includes the platform domain in connect-src and form-action when given", () => {
    const policy = prod({ platformDomain: "simplepress.co" });
    expect(getDirective(policy, "connect-src")).toContain(
      "https://simplepress.co",
    );
    expect(getDirective(policy, "connect-src")).toContain(
      "https://*.simplepress.co",
    );
    expect(getDirective(policy, "form-action")).toContain(
      "https://simplepress.co",
    );
  });

  it("omits the platform domain when null or a localhost value", () => {
    expect(prod({ platformDomain: null })).not.toContain("simplepress.co");
    expect(prod({ platformDomain: "localhost:3000" })).not.toContain(
      "https://localhost",
    );
  });

  it("reports to Sentry, tagged with the environment", () => {
    const reportUri = getDirective(prod(), "report-uri") ?? "";
    expect(reportUri).toContain(
      "https://o4511181241384960.ingest.us.sentry.io/api/4511181245972480/security/",
    );
    expect(reportUri).toContain("sentry_key=");
    expect(reportUri).toContain("sentry_environment=production");

    expect(
      getDirective(
        buildCsp(NONCE, {
          dev: false,
          preview: true,
          storageOrigin: null,
          platformDomain: null,
        }),
        "report-uri",
      ),
    ).toContain("sentry_environment=preview");
  });

  it("emits no null/undefined/empty tokens in any directive", () => {
    for (const policy of [
      prod(),
      prod({ storageOrigin: "https://storage.example.com" }),
      buildCsp(NONCE, {
        dev: true,
        preview: true,
        storageOrigin: null,
        platformDomain: "simplepress.co",
      }),
    ]) {
      expect(policy).not.toMatch(/\bnull\b|\bundefined\b/);
      expect(policy).not.toMatch(/ {2}/);
      // No directive may be name-only (i.e. every one has at least one source,
      // which would otherwise silently mean "block everything" once enforced).
      for (const part of policy.split(";")) {
        expect(part.trim()).toMatch(/^[a-z-]+ \S/);
      }
    }
  });

  it("produces a header value with no characters that break header parsing", () => {
    expect(prod()).not.toMatch(/[\r\n]/);
  });
});
