"use client";

import { Pause, Play } from "lucide-react";

import { useVideoAutoplay } from "./use-video-autoplay";

interface ServiceHeroVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  buttonClassName?: string;
}

/**
 * Full-bleed background video with WCAG 2.2.2-compliant pause/play toggle.
 *
 * The video is absolutely positioned (inset:0, 100% × 100%, objectFit:cover)
 * by default — callers are responsible for making the wrapper relative/sized.
 * Override any of those defaults via the `style` prop.
 *
 * The toggle button is positioned absolute at bottom-right of the wrapper,
 * so the wrapper must establish a positioning context (position:relative or
 * higher).
 */
export function ServiceHeroVideo({
  src,
  className,
  style,
  buttonClassName,
}: ServiceHeroVideoProps) {
  const { videoRef, videoPaused, reduceMotion, toggleVideo } =
    useVideoAutoplay();

  return (
    <>
      <video
        ref={videoRef}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        aria-hidden="true"
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...style,
        }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* WCAG 2.2.2 — Pause, Stop, Hide */}
      <button
        type="button"
        onClick={toggleVideo}
        aria-label={videoPaused ? "Play background video" : "Pause background video"}
        className={buttonClassName}
        style={{
          position: "absolute",
          bottom: "clamp(16px, 3vh, 32px)",
          right: "clamp(16px, 3vw, 32px)",
          zIndex: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.45)",
          background: "rgba(0,0,0,0.35)",
          color: "#fff",
          cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        {videoPaused ? (
          <Play size={16} aria-hidden="true" />
        ) : (
          <Pause size={16} aria-hidden="true" />
        )}
      </button>
    </>
  );
}
