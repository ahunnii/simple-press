import type { MetadataRoute } from "next";
import { describe, expect, it, vi } from "vitest";

import robots from "./robots";

/**
 * Mock next/headers to return a Headers object with a specific host.
 */
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    const headerMap = new Map([["host", "demo.localhost:3000"]]);
    return {
      get: (key: string) => headerMap.get(key) ?? null,
    } as unknown as Headers;
  }),
}));

/**
 * Mock ~/server/db to return a business or null based on test setup.
 */
let mockBusinessData: {
  allowAiCrawlers: boolean;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string;
} | null = {
  allowAiCrawlers: true,
  subdomain: "demo",
  customDomain: null,
  domainStatus: "active",
};

vi.mock("~/server/db", () => ({
  db: {
    business: {
      findFirst: vi.fn(async () => mockBusinessData),
    },
  },
}));

/**
 * Mock ~/lib/canonical
 */
vi.mock("~/lib/canonical", () => ({
  getCanonicalBaseUrl: vi.fn(
    (business: { subdomain: string }) =>
      `https://${business.subdomain}.example.com`,
  ),
}));

/**
 * Mock ~/lib/domain-utils
 */
vi.mock("~/lib/domain-utils", () => ({
  businessHostFilter: vi.fn(() => ({ subdomain: "demo" })),
}));

/**
 * Google/Bing-style robots.txt matching:
 * - If pattern ends with `$`, it must match exactly up to end-of-URL
 * - Otherwise, it matches by prefix
 * - Query strings are part of the URL path for matching purposes
 */
function isPathDisallowed(pattern: string, path: string): boolean {
  if (pattern.endsWith("$")) {
    // Exact match (minus the $)
    return path === pattern.slice(0, -1);
  }
  // Prefix match
  return path.startsWith(pattern);
}

/** `rules` is typed as a single rule or an array; robots() always returns an array. */
function rulesOf(result: MetadataRoute.Robots) {
  return Array.isArray(result.rules) ? result.rules : [result.rules];
}

describe("robots", () => {
  describe("disallow path anchoring", () => {
    it("expands /order into /order$, /order/, /order? rules", async () => {
      const result = await robots();
      const wildcardRule = rulesOf(result).find((r) => r.userAgent === "*");

      expect(wildcardRule).toBeDefined();
      expect(wildcardRule?.disallow as string[]).toContain("/order$");
      expect(wildcardRule?.disallow as string[]).toContain("/order/");
      expect(wildcardRule?.disallow as string[]).toContain("/order?");
      expect(wildcardRule?.disallow as string[]).not.toContain("/order");
    });

    it("allows /order-online and /accounting to pass (no bare /order or /account prefix)", async () => {
      const result = await robots();
      const wildcardRule = rulesOf(result).find((r) => r.userAgent === "*");

      expect(wildcardRule).toBeDefined();
      const disallowed = (wildcardRule?.disallow as string[]) ?? [];

      // /order-online should not match any pattern
      const orderOnlineBlocked = disallowed.some((pattern: string) =>
        isPathDisallowed(pattern, "/order-online"),
      );
      expect(orderOnlineBlocked).toBe(false);

      // /accounting should not match any pattern
      const accountingBlocked = disallowed.some((pattern: string) =>
        isPathDisallowed(pattern, "/accounting"),
      );
      expect(accountingBlocked).toBe(false);
    });

    it("blocks /cart, /cart/x, /account/orders, /checkout?step=2", async () => {
      const result = await robots();

      const wildcardRule = rulesOf(result).find((r) => r.userAgent === "*");

      expect(wildcardRule).toBeDefined();
      const disallowed = (wildcardRule?.disallow as string[]) ?? [];

      const testCases = [
        { path: "/cart", expected: true },
        { path: "/cart/x", expected: true },
        { path: "/account/orders", expected: true },
        { path: "/checkout?step=2", expected: true },
      ];

      for (const { path, expected } of testCases) {
        const isBlocked = disallowed.some((pattern: string) =>
          isPathDisallowed(pattern, path),
        );
        expect(isBlocked).toBe(expected);
      }
    });
  });

  describe("AI crawler rules with allowAiCrawlers true", () => {
    it("includes array userAgent with GPTBot and Claude-SearchBot", async () => {
      mockBusinessData = {
        allowAiCrawlers: true,
        subdomain: "demo",
        customDomain: null,
        domainStatus: "active",
      };

      const result = await robots();

      const aiRule = rulesOf(result).find((r) => Array.isArray(r.userAgent));

      expect(aiRule).toBeDefined();
      expect(Array.isArray(aiRule?.userAgent)).toBe(true);
      const userAgents = aiRule?.userAgent as string[];
      expect(userAgents.includes("GPTBot")).toBe(true);
      expect(userAgents.includes("Claude-SearchBot")).toBe(true);
    });

    it("has allow: / with anchored disallow list", async () => {
      mockBusinessData = {
        allowAiCrawlers: true,
        subdomain: "demo",
        customDomain: null,
        domainStatus: "active",
      };

      const result = await robots();

      const aiRule = rulesOf(result).find((r) => Array.isArray(r.userAgent));

      expect(aiRule?.allow).toBe("/");
      expect(aiRule?.disallow).toBeDefined();
      const disallow = aiRule?.disallow as string[];
      expect(disallow.length).toBeGreaterThan(0);
      // Should include anchored versions like /admin$, /admin/, /admin?
      expect(disallow.includes("/admin$")).toBe(true);
    });
  });

  describe("AI crawler rules with allowAiCrawlers false", () => {
    it("has disallow: /", async () => {
      mockBusinessData = {
        allowAiCrawlers: false,
        subdomain: "demo",
        customDomain: null,
        domainStatus: "active",
      };

      const result = await robots();

      const aiRule = rulesOf(result).find((r) => Array.isArray(r.userAgent));

      expect(aiRule?.disallow).toBe("/");
      expect(aiRule?.allow).toBeUndefined();
    });
  });

  describe("AI crawler rules with business null", () => {
    it("allows AI crawlers (allow: /)", async () => {
      mockBusinessData = null;

      const result = await robots();

      const aiRule = rulesOf(result).find((r) => Array.isArray(r.userAgent));

      expect(aiRule?.allow).toBe("/");
      expect(aiRule?.disallow).toBeDefined();
      const disallow = aiRule?.disallow as string[];
      expect(disallow.length).toBeGreaterThan(0);
    });
  });

  describe("AI crawler user agents", () => {
    it("includes new crawlers: Claude-User, Claude-SearchBot, Perplexity-User, meta-externalagent, Amazonbot, DuckAssistBot, cohere-ai, MistralAI-User", async () => {
      const result = await robots();

      const aiRule = rulesOf(result).find((r) => Array.isArray(r.userAgent));

      const userAgents = aiRule?.userAgent as string[];
      expect(userAgents.includes("Claude-User")).toBe(true);
      expect(userAgents.includes("Claude-SearchBot")).toBe(true);
      expect(userAgents.includes("Perplexity-User")).toBe(true);
      expect(userAgents.includes("meta-externalagent")).toBe(true);
      expect(userAgents.includes("Amazonbot")).toBe(true);
      expect(userAgents.includes("DuckAssistBot")).toBe(true);
      expect(userAgents.includes("cohere-ai")).toBe(true);
      expect(userAgents.includes("MistralAI-User")).toBe(true);
    });
  });

  describe("sitemap URL", () => {
    it("uses getCanonicalBaseUrl when business exists", async () => {
      mockBusinessData = {
        allowAiCrawlers: true,
        subdomain: "demo",
        customDomain: null,
        domainStatus: "active",
      };

      const result = await robots();
      expect(result.sitemap).toBe("https://demo.example.com/sitemap.xml");
    });

    it("falls back to host-based URL when business is null", async () => {
      mockBusinessData = null;

      const result = await robots();
      expect(result.sitemap).toBe("https://demo.localhost:3000/sitemap.xml");
    });
  });
});
