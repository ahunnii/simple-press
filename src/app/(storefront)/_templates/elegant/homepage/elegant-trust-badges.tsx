"use client";

import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";

import { DEFAULT_ELEGANT_TRUST_BADGES } from "..";

export function ElegantTrustBadges({
  homepage,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
}) {
  const trustBadges = parseTemplateIconListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "elegant.homepage.trust-badges-list",
    ),
    DEFAULT_ELEGANT_TRUST_BADGES,
  );

  const items = trustBadges?.length ? trustBadges : DEFAULT_ELEGANT_TRUST_BADGES;

  return (
    <div
      style={{
        overflow: "hidden",
        borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
        borderBottom: "1px solid var(--el-line, rgba(28,26,23,0.12))",
        padding: "22px 0",
        background: "var(--el-paper, #fbf8f2)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 64,
          whiteSpace: "nowrap",
          animation: "el-marquee 40s linear infinite",
          width: "max-content",
        }}
      >
        {/* Doubled list for seamless loop */}
        {[...items, ...items].map((badge, i) => (
          <span
            key={i}
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: 28,
              fontStyle: "italic",
              display: "inline-flex",
              alignItems: "center",
              gap: 64,
              color: "var(--el-ink, #1c1a17)",
              flexShrink: 0,
            }}
          >
            {badge.title}
            <span
              style={{
                fontSize: 14,
                fontStyle: "normal",
                color: "var(--el-sage, #4a5240)",
              }}
            >
              ✿
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
