"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { resolveFields } from "..";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

export function ElegantCTABanner({
  homepage,
  sectionAttrs,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  const { ref, visible } = useReveal();
  const reducedMotion = useReducedMotion();
  const customFields = homepage?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "elegant.cta.background",
    "elegant.cta.title",
    "elegant.cta.pointone",
    "elegant.cta.pointtwo",
    "elegant.cta.pointthree",
  ]);

  const bgImage = f["elegant.cta.background"] ?? "";
  const title = f["elegant.cta.title"] ?? "";
  const points = [
    { key: "elegant.cta.pointone", value: f["elegant.cta.pointone"] ?? "" },
    { key: "elegant.cta.pointtwo", value: f["elegant.cta.pointtwo"] ?? "" },
    {
      key: "elegant.cta.pointthree",
      value: f["elegant.cta.pointthree"] ?? "",
    },
  ].filter((point) => point.value.length > 0);

  const hasBg = bgImage && bgImage !== "/placeholder.svg";

  return (
    <section
      {...sectionAttrs}
      style={{
        padding: "80px 40px",
        background: "var(--el-cream-2, #ebe6dc)",
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div
          ref={ref}
          style={{
            position: "relative",
            minHeight: 400,
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            padding: "60px 64px",
            background: hasBg ? undefined : "var(--el-ink, #1c1a17)",
            ...(reducedMotion
              ? {}
              : {
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.9s ${easeOut}, transform 0.9s ${easeOut}`,
                }),
          }}
        >
          {hasBg && (
            <Image
              src={bgImage}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          )}
          {/* Dark overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(28, 26, 23, 0.55)",
            }}
          />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, maxWidth: 560 }}>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 400,
                fontSize: "clamp(40px, 5vw, 64px)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                color: "var(--el-paper, #fbf8f2)",
                marginBottom: 28,
              }}
              {...fieldAttr("elegant.cta.title")}
            >
              {title}
            </h2>

            <ul style={{ listStyle: "none" }}>
              {points.map((point) => (
                <li
                  key={point.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: 15,
                  }}
                >
                  <Check
                    aria-hidden={true}
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      color: "var(--el-sage-soft, #8a9474)",
                    }}
                  />
                  <span {...fieldAttr(point.key)}>{point.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
