/**
 * The color studio's garland sketch — a JSX port of the prototype's
 * `renderGarlandSvg` (`docs/templates/dream/checkpoint/balloon-studio`).
 * All math lives in `dream-balloon-garland-layout.ts`; this file only turns
 * the model into SVG elements.
 *
 * - `role="img"` + `<title>` naming the colors ("Balloon garland sketch in
 *   Pearl Gold, Crystal Blue and …"); the empty state is dashed ghost
 *   outlines with its own title.
 * - Gradient/filter ids are namespaced with `useId()` so two garlands on a
 *   page never collide.
 * - The pop-in is CSS only (`.is-animated .dream-balloon-garland-balloon`,
 *   staggered by `--i`) and switched off by the reduced-motion block; the
 *   parent remounts the SVG (React `key`) to replay it on each change.
 * - Colors are the content here, so the frame opts out of forced-colors
 *   (`forced-color-adjust: none` in globals.css).
 */
import type { CSSProperties } from "react";
import { useId } from "react";

import type {
  GarlandColor,
  GarlandGradient,
} from "./dream-balloon-garland-layout";

import {
  balloonPath,
  buildGarlandModel,
  GARLAND_VIEWBOX,
  knotPath,
} from "./dream-balloon-garland-layout";

function Gradient({ g }: { g: GarlandGradient }) {
  const stops = g.stops.map((s, i) => (
    <stop
      key={i}
      offset={s.offset}
      stopColor={s.color}
      stopOpacity={s.opacity}
    />
  ));
  if (g.kind === "radial") {
    return (
      <radialGradient id={g.id} cx={g.cx} cy={g.cy} r={g.r} fx={g.fx} fy={g.fy}>
        {stops}
      </radialGradient>
    );
  }
  return (
    <linearGradient id={g.id} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
      {stops}
    </linearGradient>
  );
}

const fx1 = (n: number) => Number(n.toFixed(1));

export function DreamBalloonGarland({
  colors,
  shuffle = 0,
  max = 6,
  animate = true,
}: {
  colors: readonly GarlandColor[];
  shuffle?: number;
  /** Palette size, for the empty state's title. */
  max?: number;
  animate?: boolean;
}) {
  const uid = `bg${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const titleId = `${uid}-title`;
  const model = buildGarlandModel(colors, { uid, shuffle, max });
  const { width, height } = GARLAND_VIEWBOX;

  const svgProps = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-labelledby": titleId,
    className:
      "dream-balloon-garland-svg" +
      (animate && model.kind === "filled" ? " is-animated" : ""),
  } as const;

  if (model.kind === "empty") {
    return (
      <svg {...svgProps}>
        <title id={titleId}>{model.title}</title>
        {model.slots.map((s) => (
          <g
            key={s.index}
            transform={`translate(${s.x} ${s.y}) rotate(${s.tilt})`}
          >
            <path
              d={balloonPath(s.r)}
              className="dream-balloon-garland-ghost"
            />
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <title id={titleId}>{model.title}</title>
      <defs>
        <filter
          id={model.shadowId}
          x="-30%"
          y="-30%"
          width="160%"
          height="170%"
        >
          <feGaussianBlur stdDeviation="5" />
        </filter>
        {model.defs.map((g) => (
          <Gradient key={g.id} g={g} />
        ))}
      </defs>
      {model.balloons.map(({ slot: s, order, shader: sh, knot }) => {
        const d = balloonPath(s.r);
        const sharpX = fx1(-s.r * 0.36);
        const sharpY = fx1(-s.r * 0.48);
        const specX = fx1(-s.r * 0.4);
        const specY = fx1(-s.r * 0.46);
        return (
          <g
            key={s.index}
            transform={`translate(${s.x} ${s.y}) rotate(${s.tilt})`}
          >
            <g
              className="dream-balloon-garland-balloon"
              style={{ "--i": order } as CSSProperties}
            >
              {/* Soft offset shadow (always offset + blurred, per the dream craft floor). */}
              <path
                d={d}
                transform={`translate(${fx1(s.r * 0.12)} ${fx1(s.r * 0.22)})`}
                fill="#2b211d"
                opacity={0.16}
                filter={`url(#${model.shadowId})`}
              />
              <path
                d={knotPath(s.r)}
                fill={knot}
                fillOpacity={sh.bodyOpacity}
              />
              <path
                d={d}
                fill={sh.body}
                fillOpacity={sh.bodyOpacity}
                stroke={sh.rim}
                strokeOpacity={sh.rim ? 0.75 : undefined}
                strokeWidth={sh.rim ? 1.4 : undefined}
              />
              {sh.layers.map((layer, i) => (
                <path key={i} d={d} fill={layer} />
              ))}
              {sh.sharp ? (
                <ellipse
                  cx={sharpX}
                  cy={sharpY}
                  rx={fx1(s.r * 0.17)}
                  ry={fx1(s.r * 0.09)}
                  transform={`rotate(-38 ${sharpX} ${sharpY})`}
                  fill={sh.sharp}
                />
              ) : null}
              {sh.spec ? (
                <ellipse
                  cx={specX}
                  cy={specY}
                  rx={fx1(s.r * 0.13)}
                  ry={fx1(s.r * 0.075)}
                  transform={`rotate(-40 ${specX} ${specY})`}
                  fill={`url(#${model.specId})`}
                  opacity={sh.spec}
                />
              ) : null}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
