"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";

import { useVideoAutoplay } from "./use-video-autoplay";

interface ServiceSectionMediaProps {
  imageSrc?: string;
  videoSrc?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  rounded?: boolean;
}

/**
 * Renders either a video (takes precedence) or an image for use inside a
 * philosophy/intro section. Returns null if neither src is provided.
 *
 * Video: muted loop with reduced-motion-aware autoplay + WCAG 2.2.2 toggle.
 * Image: Next.js <Image> with fill layout inside an aspect-ratio wrapper.
 *
 * The `rounded` prop (default true) applies a modest border-radius.
 * Pass className/style on the wrapper to control size, aspect ratio, etc.
 */
export function ServiceSectionMedia({
  imageSrc,
  videoSrc,
  alt,
  className,
  style,
  rounded = true,
}: ServiceSectionMediaProps) {
  const { videoRef, videoPaused, reduceMotion, toggleVideo } =
    useVideoAutoplay();

  const borderRadius = rounded ? "0.5rem" : undefined;

  if (videoSrc) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius,
          ...style,
        }}
      >
        <video
          ref={videoRef}
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        {/* WCAG 2.2.2 — Pause, Stop, Hide */}
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={
            videoPaused ? "Play background video" : "Pause background video"
          }
          style={{
            position: "absolute",
            bottom: "clamp(10px, 2vh, 20px)",
            right: "clamp(10px, 2vw, 20px)",
            zIndex: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.45)",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          {videoPaused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  if (imageSrc) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius,
          ...style,
        }}
      >
        <Image
          src={imageSrc}
          alt={alt ?? ""}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }

  return null;
}
