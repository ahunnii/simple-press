"use client";

import { useDreamAmbient } from "../hooks/use-dream-ambient";

/**
 * Mounted once in `DreamLayout`. Renders nothing — it only arms the
 * `.dream-js` progressive-enhancement gate and the cloud/balloon
 * visibility-pause behavior (see `use-dream-ambient.ts`).
 */
export function DreamAmbientController() {
  useDreamAmbient();
  return null;
}
