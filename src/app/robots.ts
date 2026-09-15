import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getCanonicalBaseUrl } from "~/lib/canonical";
import { businessHostFilter } from "~/lib/domain-utils";
import { db } from "~/server/db";

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
];

/**
 * Shared disallow list for both the `*` rule and every AI-crawler rule below.
 * Hoisted so the two rule sets can never drift from each other.
 */
const DISALLOWED_PATHS = [
  "/admin",
  "/api",
  "/platform",
  "/cart",
  "/checkout",
  "/account",
  "/order",
  "/auth",
  "/wishlist",
  "/subscribe",
  "/subscriptions",
  "/editor",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(host),
      status: "active",
    },
    select: {
      allowAiCrawlers: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
    },
  });

  const aiCrawlerRules: MetadataRoute.Robots["rules"] = AI_CRAWLERS.map(
    (agent) => ({
      userAgent: agent,
      ...(business === null || business.allowAiCrawlers
        ? {
            allow: "/",
            disallow: DISALLOWED_PATHS,
          }
        : { disallow: "/" }),
    }),
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      ...aiCrawlerRules,
    ],
    sitemap:
      business !== null
        ? `${getCanonicalBaseUrl(business)}/sitemap.xml`
        : `https://${host}/sitemap.xml`,
  };
}
