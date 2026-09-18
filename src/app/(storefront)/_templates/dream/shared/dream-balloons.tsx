/**
 * Five CSS balloons (rose / gold / paper / rose-2 / gold-2), opacity ≤ .6,
 * rising over 22–28s — the hero-only ambient detail from design.md
 * ("Balloons — the easter egg", revised 2026-09-17: 5 balloons, two
 * rose-soft, two gold-soft, one white with a gold hairline). Pure CSS
 * shapes, no sprites, so it costs nothing to render. `DreamAmbientController`
 * pauses the rise via `[data-paused]`; the reduced-motion block hides the
 * layer entirely (`display: none`) rather than parking it, since a still
 * balloon mid-rise reads as a mistake where a still cloud reads as a calm
 * sky.
 */
export function DreamBalloons() {
  return (
    <div className="dream-balloons" aria-hidden="true">
      <span className="dream-balloon dream-balloon--rose" />
      <span className="dream-balloon dream-balloon--gold" />
      <span className="dream-balloon dream-balloon--paper" />
      <span className="dream-balloon dream-balloon--rose-2" />
      <span className="dream-balloon dream-balloon--gold-2" />
    </div>
  );
}
