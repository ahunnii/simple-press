"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  bandImage?: string;
  bandHeading?: string;
  bandText?: string;
};

export function ViiImageBand({ bandImage, bandHeading, bandText }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  // Parallax scroll listener — skipped entirely when reduced motion is preferred.
  useEffect(() => {
    if (!bandImage?.trim()) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const wrapper = wrapperRef.current;
    const imgWrap = imageRef.current;
    if (!wrapper || !imgWrap) return;

    let rafId: number | null = null;

    function onScroll() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!wrapper || !imgWrap) return;
        const rect = wrapper.getBoundingClientRect();
        const viewH = window.innerHeight;
        // Only apply transform when the section is near the viewport.
        if (rect.bottom < 0 || rect.top > viewH) return;
        // progress: 0 when section bottom enters viewport; 1 when top leaves.
        const progress = (viewH - rect.top) / (viewH + rect.height);
        // Shift ±8% (small enough not to reveal image edges at 130% height).
        const translateY = (progress - 0.5) * 16;
        imgWrap.style.transform = `translateY(${translateY}%)`;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // Sync on mount.

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [bandImage]);

  // No image: render a thin navy divider (unchanged fallback).
  if (!bandImage?.trim()) {
    return (
      <div
        aria-hidden="true"
        {...sectionGroupAttr("homepage", "band")}
        style={{
          width: "100%",
          height: 8,
          background: "var(--vii-navy)",
        }}
      />
    );
  }

  const hasOverlay = !!(bandHeading?.trim() ?? bandText?.trim());

  return (
    <div
      ref={wrapperRef}
      {...sectionGroupAttr("homepage", "band")}
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(240px, 30vw, 480px)",
        overflow: "hidden",
      }}
    >
      {/* Image wrapper — taller than band so parallax never reveals an edge */}
      <div
        ref={imageRef}
        style={{
          position: "absolute",
          top: "-15%",
          left: 0,
          width: "100%",
          height: "130%",
          willChange: "transform",
        }}
      >
        <Image
          src={bandImage}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Scrim + overlay text — only rendered when at least one field is set */}
      {hasOverlay && (
        <>
          {/* Scrim */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, color-mix(in srgb, var(--vii-navy) 55%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 70%, transparent) 100%)",
              zIndex: 1,
            }}
          />

          {/* Centered content */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 clamp(24px, 8vw, 120px)",
            }}
          >
            {bandHeading?.trim() && (
              <h2
                {...fieldAttr("vii.homepage.band-heading")}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(28px, 4vw, 56px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--vii-paper)",
                  lineHeight: 1.15,
                  marginBottom: bandText?.trim() ? 16 : 0,
                }}
              >
                {bandHeading}
              </h2>
            )}
            {bandText?.trim() && (
              <p
                {...fieldAttr("vii.homepage.band-text")}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(13px, 1.2vw, 16px)",
                  lineHeight: 1.7,
                  color: "var(--vii-paper)",
                  opacity: 0.85,
                  maxWidth: 560,
                  margin: 0,
                }}
              >
                {bandText}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
