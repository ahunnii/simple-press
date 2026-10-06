/**
 * Three CSS balloons (rose / gold / paper), opacity ≤ .6, rising over
 * 22–26s — the hero-only ambient detail from design.md ("Balloons — the
 * easter egg"; brief: "2–3, low opacity, hero only"). Cut back from five on
 * 2026-10-05: two of the five lanes crossed the protected center. Rose
 * rides the left lane, gold and paper (white with a gold hairline) the
 * right; the layer is hidden below 960px, where no lane clears the copy.
 * Pure CSS shapes, no sprites, so it costs nothing to render.
 * `DreamAmbientController` pauses the rise via `[data-paused]`; the
 * reduced-motion block hides the layer entirely (`display: none`) rather
 * than parking it, since a still balloon mid-rise reads as a mistake where
 * a still cloud reads as a calm sky.
 */
export function DreamBalloons() {
  return (
    <div className="dream-balloons" aria-hidden="true">
      <span className="dream-balloon dream-balloon--rose" />
      <span className="dream-balloon dream-balloon--gold" />
      <span className="dream-balloon dream-balloon--paper" />
    </div>
  );
}
