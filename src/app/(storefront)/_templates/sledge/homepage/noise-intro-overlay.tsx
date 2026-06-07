"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Default color palette when no gallery is configured
const DEFAULT_TILES = [
  { c: "#3e3a35", t: "I" },
  { c: "#a9c8d4", t: "II" },
  { c: "#5b4a30", t: "III" },
  { c: "#1a1a1a", t: "IV" },
  { c: "#cfd9e8", t: "V" },
  { c: "#2f5b5b", t: "VI" },
  { c: "#6c8674", t: "VII" },
  { c: "#c8b89a", t: "VIII" },
  { c: "#2a3247", t: "IX" },
  { c: "#4a3a2d", t: "X" },
  { c: "#e8e2d3", t: "XI" },
  { c: "#7a3b1d", t: "XII" },
] as const;

// Deterministic stagger delays (avoids hydration mismatch)
const TILE_DELAYS = DEFAULT_TILES.map((_, i) => i * 70 + (i % 3) * 15);

const TOTAL_TILES = 12;

type ImageEntry = { url: string; altText: string | null };
type Slot =
  | { kind: "image"; url: string; altText: string }
  | { kind: "color"; c: string; t: string };

/** Evenly distributes N images across 12 tile positions, filling the rest with colors. */
function buildSlots(images: ImageEntry[]): Slot[] {
  const count = Math.min(images.length, TOTAL_TILES);

  const imageSlotIndices = new Set<number>();
  if (count === 1) {
    imageSlotIndices.add(5);
  } else if (count > 1) {
    for (let i = 0; i < count; i++) {
      imageSlotIndices.add(Math.round((i * (TOTAL_TILES - 1)) / (count - 1)));
    }
  }

  let imgIdx = 0;
  let colorIdx = 0;
  return Array.from({ length: TOTAL_TILES }, (_, i): Slot => {
    if (imageSlotIndices.has(i)) {
      const img = images[imgIdx++]!;
      return { kind: "image", url: img.url, altText: img.altText ?? "" };
    }
    const color = DEFAULT_TILES[colorIdx % DEFAULT_TILES.length]!;
    colorIdx++;
    return { kind: "color", c: color.c, t: color.t };
  });
}

export function NoiseIntroOverlay({
  onDone,
  images,
  wordmark,
  locationTag,
}: {
  onDone: () => void;
  images?: ImageEntry[];
  wordmark?: string;
  locationTag?: string;
}) {
  const [phase, setPhase] = useState(0);
  const skippedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const skipBtnRef = useRef<HTMLButtonElement>(null);

  const slots = buildSlots(images ?? []);
  const curtainOpen = phase >= 2;
  const logoVisible = phase >= 1;

  const skip = useCallback(() => {
    skippedRef.current = true;
    onDoneRef.current();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      skip();
      return;
    }
    const t1 = setTimeout(() => {
      if (!skippedRef.current) setPhase(1);
    }, 1300);
    const t2 = setTimeout(() => {
      if (!skippedRef.current) setPhase(2);
    }, 2700);
    const t3 = setTimeout(() => {
      onDoneRef.current();
    }, 3700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [skip]);

  useEffect(() => {
    skipBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "Tab") {
        e.preventDefault();
        skipBtnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [skip]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Intro animation"
      className="sl-intro-overlay"
    >
      <div
        aria-hidden="true"
        data-open={curtainOpen ? "true" : "false"}
        className="sl-intro-curtain sl-intro-curtain-left"
      >
        <IntroScene
          slots={slots}
          tileDelays={TILE_DELAYS}
          logoVisible={logoVisible}
          half="left"
          wordmark={wordmark}
          locationTag={locationTag}
        />
      </div>

      <div
        aria-hidden="true"
        data-open={curtainOpen ? "true" : "false"}
        className="sl-intro-curtain sl-intro-curtain-right"
      >
        <IntroScene
          slots={slots}
          tileDelays={TILE_DELAYS}
          logoVisible={logoVisible}
          half="right"
          wordmark={wordmark}
          locationTag={locationTag}
        />
      </div>

      <div
        data-open={curtainOpen ? "true" : "false"}
        className="sl-intro-seam"
        aria-hidden="true"
      />

      <button
        ref={skipBtnRef}
        type="button"
        onClick={skip}
        aria-label="Skip intro animation"
        data-open={curtainOpen ? "true" : "false"}
        className="sl-intro-skip vn-focus-on-dark"
      >
        SKIP →
      </button>
    </div>
  );
}

function IntroScene({
  slots,
  tileDelays,
  logoVisible,
  half,
  wordmark,
  locationTag,
}: {
  slots: Slot[];
  tileDelays: number[];
  logoVisible: boolean;
  half: "left" | "right";
  wordmark?: string;
  locationTag?: string;
}) {
  return (
    <div
      className={
        half === "left" ? "sl-intro-scene-left" : "sl-intro-scene-right"
      }
    >
      <div className="sl-intro-grid">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="sl-intro-tile"
            style={{
              ...(slot.kind === "color" ? { background: slot.c } : {}),
              animationDelay: `${tileDelays[i]}ms`,
            }}
          >
            {slot.kind === "image" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slot.url}
                  alt={slot.altText}
                  className="sl-intro-tile-img"
                />
                <div className="sl-intro-tile-sheen" />
              </>
            ) : (
              <>
                <div className="sl-intro-tile-sheen sl-intro-tile-sheen-muted" />
                <div className="sl-intro-tile-label">{slot.t}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div
        data-visible={logoVisible ? "true" : "false"}
        className="sl-intro-veil"
        aria-hidden="true"
      />

      <div
        data-visible={logoVisible ? "true" : "false"}
        className="sl-intro-wordmark-wrap"
        aria-hidden="true"
      >
        <div className="sl-intro-wordmark">
          {wordmark ? wordmark.toUpperCase() : ""}
        </div>
        <div
          data-visible={logoVisible ? "true" : "false"}
          className="sl-intro-rule"
        />
        {locationTag && (
          <div className="sl-intro-location">{locationTag}</div>
        )}
      </div>
    </div>
  );
}
