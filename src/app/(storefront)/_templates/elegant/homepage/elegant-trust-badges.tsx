"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";

import { DEFAULT_ELEGANT_TRUST_BADGES } from "..";

export function ElegantTrustBadges({
  homepage,
  sectionAttrs,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
  /** Spread on root <div> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  const [isPaused, setIsPaused] = useState(false);

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
      {...sectionAttrs}
      style={{
        overflow: "hidden",
        borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
        borderBottom: "1px solid var(--el-line, rgba(28,26,23,0.12))",
        padding: "22px 0",
        background: "var(--el-paper, #fbf8f2)",
        position: "relative",
      }}
    >
      <div
        className="el-marquee-track"
        style={{
          display: "flex",
          gap: 64,
          whiteSpace: "nowrap",
          animation: "el-marquee 40s linear infinite",
          animationPlayState: isPaused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {items.map((badge, i) => (
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
        {/* Duplicate for seamless loop — hidden from screen readers */}
        <span aria-hidden="true" style={{ display: "contents" }}>
          {items.map((badge, i) => (
            <span
              key={`dup-${i}`}
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
              <span style={{ fontSize: 14, fontStyle: "normal", color: "var(--el-sage, #4a5240)" }}>
                ✿
              </span>
            </span>
          ))}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setIsPaused((p) => !p)}
        aria-label={isPaused ? "Resume scrolling banner" : "Pause scrolling banner"}
        style={{
          position: "absolute",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
          background: "var(--el-paper, #fbf8f2)",
          cursor: "pointer",
          color: "var(--el-ink-soft, #6b6659)",
          zIndex: 2,
        }}
        className="el-icon-btn"
      >
        {isPaused ? <Play size={11} /> : <Pause size={11} />}
      </button>
    </div>
  );
}
