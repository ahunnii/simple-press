import type { MetadataRoute } from "next";
import { headers } from "next/headers";

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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(host),
      status: "active",
    },
    select: { allowAiCrawlers: true },
  });

  const aiCrawlerRules: MetadataRoute.Robots["rules"] = AI_CRAWLERS.map(
    (agent) => ({
      userAgent: agent,
      ...(business === null || business.allowAiCrawlers
        ? {
            allow: "/",
            disallow: [
              "/admin",
              "/api",
              "/platform",
              "/cart",
              "/checkout",
              "/account",
              "/order",
            ],
          }
        : { disallow: "/" }),
    }),
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/platform",
          "/cart",
          "/checkout",
          "/account",
          "/order",
        ],
      },
      ...aiCrawlerRules,
    ],
    sitemap: `https://${host}/sitemap.xml`,
  };
}
