/**
 * SledgeWave
 * An SVG wavy divider that visually connects two color-block sections.
 * The `to` prop sets the fill of the wave (i.e. the background color of the
 * NEXT section below), making it appear to "flow" out of the current section.
 */

const FILL_MAP = {
  cream: "#e7f4dd",  // --sl-cream
  green: "#8ed36c",  // --sl-green
  dark:  "#161616",  // --sl-dark
} as const;

type WaveTo = keyof typeof FILL_MAP;

export function SledgeWave({ to }: { to: WaveTo }) {
  const fill = FILL_MAP[to];
  return (
    <div
      aria-hidden="true"
      style={{ display: "block", lineHeight: 0, overflow: "hidden" }}
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%", height: "80px" }}
      >
        <path
          d="M0,40 C120,80 240,0 360,40 C480,80 600,0 720,40 C840,80 960,0 1080,40 C1200,80 1320,0 1440,40 L1440,80 L0,80 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
