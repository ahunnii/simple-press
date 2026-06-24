"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared hook for video autoplay with:
 * - prefers-reduced-motion support (starts paused when reduce is active)
 * - pause/play toggle state
 *
 * Returns a ref to attach to the <video> element and toggle/state utilities.
 */
export function useVideoAutoplay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduceMotion(true);
      setVideoPaused(true);
      videoRef.current?.pause();
    }
  }, []);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
      setVideoPaused(false);
    } else {
      v.pause();
      setVideoPaused(true);
    }
  };

  return { videoRef, videoPaused, reduceMotion, toggleVideo };
}
