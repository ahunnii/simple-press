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
  "Claude-User",
  "Claude-SearchBot",
  "Perplexity-User",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "cohere-ai",
  "MistralAI-User",
];

/**
 * Base disallow list for both the `*` rule and the AI-crawler rule below.
 * Hoisted so the two rule sets can never drift from each other.
 *
 * Robots rules are prefix matches, so a bare `/order` would also block an
 * owner's custom page at `/order-online` (likewise `/account` → `/accounting`,
 * `/auth` → `/authentic-goods`). Each base path is therefore expanded into
 * `P$` (the path itself), `P/` (anything under it) and `P?` (it with a query).
 * Google and Bing honour the `$` anchor; a crawler that doesn't just never
 * matches that line, leaving the bare path crawlable — harmless, since these
 * routes carry nothing indexable.
 */
const DISALLOWED_PATHS_BASE = [
  "/admin",
  "/api",
  "/invoice",
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

const DISALLOWED_PATHS = DISALLOWED_PATHS_BASE.flatMap((path) => [
  `${path}$`,
  `${path}/`,
  `${path}?`,
]);

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

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: AI_CRAWLERS,
        ...(business === null || business.allowAiCrawlers
          ? {
              allow: "/",
              disallow: DISALLOWED_PATHS,
            }
          : { disallow: "/" }),
      },
    ],
    sitemap:
      business !== null
        ? `${getCanonicalBaseUrl(business)}/sitemap.xml`
        : `https://${host}/sitemap.xml`,
  };
}
