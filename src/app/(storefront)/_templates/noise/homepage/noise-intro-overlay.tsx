"use client";

import { useState, useEffect, useRef } from "react";

// Product color tiles matching Visual Noise Detroit palette
const TILES = [
  { c: "#3e3a35", t: "Ashby" },
  { c: "#a9c8d4", t: "Hadley" },
  { c: "#5b4a30", t: "Pemberton" },
  { c: "#1a1a1a", t: "Crewe" },
  { c: "#cfd9e8", t: "Newland" },
  { c: "#2f5b5b", t: "Sabine" },
  { c: "#6c8674", t: "Sutton" },
  { c: "#c8b89a", t: "Bryony" },
  { c: "#2a3247", t: "Penhale" },
  { c: "#4a3a2d", t: "Amaya" },
  { c: "#e8e2d3", t: "Larkin" },
  { c: "#7a3b1d", t: "Corktown" },
] as const;

// Deterministic stagger delays (avoids hydration mismatch)
const TILE_DELAYS = TILES.map((_, i) => i * 70 + (i % 3) * 15);

export function NoiseIntroOverlay({ onDone }: { onDone: () => void }) {
  // phase 0: tiles fly in (0–1300ms)
  // phase 1: logo crystallizes (1300–2700ms)
  // phase 2: curtain opens (2700–3700ms)
  const [phase, setPhase] = useState(0);
  const skippedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => { if (!skippedRef.current) setPhase(1); }, 1300);
    const t2 = setTimeout(() => { if (!skippedRef.current) setPhase(2); }, 2700);
    const t3 = setTimeout(() => { onDoneRef.current(); }, 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  function skip() {
    skippedRef.current = true;
    onDoneRef.current();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      {/* Left curtain half */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "50%",
          overflow: "hidden",
          background: "#0e0d0b",
          transition: "transform 1s cubic-bezier(.7,0,.2,1)",
          transform: phase >= 2 ? "translateX(-100%)" : "translateX(0)",
          willChange: "transform",
        }}
      >
        <IntroScene tiles={TILES} tileDelays={TILE_DELAYS} phase={phase} half="left" />
      </div>

      {/* Right curtain half */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: "50%",
          overflow: "hidden",
          background: "#0e0d0b",
          transition: "transform 1s cubic-bezier(.7,0,.2,1)",
          transform: phase >= 2 ? "translateX(100%)" : "translateX(0)",
          willChange: "transform",
        }}
      >
        <IntroScene tiles={TILES} tileDelays={TILE_DELAYS} phase={phase} half="right" />
      </div>

      {/* Hairline split — sells the curtain seam */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          width: 1,
          background: "rgba(255,255,255,.08)",
          opacity: phase >= 2 ? 0 : 1,
          transition: "opacity .3s",
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      {/* Skip button */}
      <button
        onClick={skip}
        style={{
          position: "absolute",
          bottom: 28,
          right: 32,
          zIndex: 10,
          color: "rgba(255,255,255,.55)",
          fontSize: 11,
          letterSpacing: ".28em",
          fontWeight: 500,
          padding: "8px 14px",
          border: "1px solid rgba(255,255,255,.18)",
          background: "transparent",
          cursor: "pointer",
          opacity: phase >= 2 ? 0 : 1,
          transition: "opacity .3s",
          fontFamily: "var(--font-mono, monospace)",
          textTransform: "uppercase",
        }}
      >
        SKIP →
      </button>

      <style>{`
        @keyframes noiseIntroTileIn {
          from { opacity: 0; transform: scale(.6) translateY(28px); filter: blur(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0);    filter: blur(0); }
        }
      `}</style>
    </div>
  );
}

type TileData = { readonly c: string; readonly t: string };

function IntroScene({
  tiles,
  tileDelays,
  phase,
  half,
}: {
  tiles: readonly TileData[];
  tileDelays: number[];
  phase: number;
  half: "left" | "right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        height: "100%",
        width: "100vw",
        ...(half === "left" ? { left: 0 } : { left: "-100%" }),
      }}
    >
      {/* 4 × 3 tile grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gap: 6,
          padding: 6,
        }}
      >
        {tiles.map((tile, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              background: tile.c,
              opacity: 0,
              animation: `noiseIntroTileIn .55s cubic-bezier(.2,.7,.2,1) ${tileDelays[i]}ms forwards`,
              overflow: "hidden",
            }}
          >
            {/* Gloss sheen */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,.08), transparent 60%)",
                pointerEvents: "none",
              }}
            />
            {/* Tile label */}
            <div
              style={{
                position: "absolute",
                left: 10,
                bottom: 8,
                fontSize: 9,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.65)",
                fontWeight: 500,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {tile.t}
            </div>
          </div>
        ))}
      </div>

      {/* Radial veil — darkens for logo reveal */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(14,13,11,.55), rgba(14,13,11,.92) 70%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity .8s ease",
          pointerEvents: "none",
        }}
      />

      {/* Centered wordmark */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "#fff",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity .9s ease, letter-spacing 1.2s ease",
          letterSpacing: phase >= 1 ? ".22em" : ".4em",
          pointerEvents: "none",
          width: "100%",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif, Georgia, serif)",
            fontSize: "clamp(40px, 7vw, 96px)",
            fontWeight: 300,
            lineHeight: 1,
            fontStyle: "italic",
          }}
        >
          VISUAL NOISE
        </div>
        {/* Hairline rule */}
        <div
          style={{
            width: phase >= 1 ? 80 : 0,
            height: 1,
            background: "rgba(255,255,255,.4)",
            margin: "22px auto 0",
            transition: "width 1s ease .15s",
          }}
        />
        <div
          style={{
            fontSize: 11,
            letterSpacing: ".5em",
            opacity: 0.7,
            marginTop: 18,
            fontWeight: 500,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          · DETROIT · EST. MMXXVI ·
        </div>
      </div>
    </div>
  );
}
