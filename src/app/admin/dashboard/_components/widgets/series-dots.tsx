import type { ReactElement } from "react";

type DotRenderProps = {
  key?: string;
  index: number;
  cx?: number | null;
  cy?: number | null;
};

/**
 * A `dot` renderer for a line / area whose values can be null (an average over
 * nothing breaks the line). A point with a null neighbour on both sides would
 * draw no line at all, so it always gets a dot; with `all`, every real point
 * does (short series). Null points never do.
 */
export function seriesDot(
  values: ReadonlyArray<number | null | undefined>,
  opts: { color: string; radius: number; all?: boolean },
) {
  return function renderDot(props: DotRenderProps): ReactElement<SVGElement> {
    const { index, cx, cy, key } = props;
    const empty = <g key={key} />;
    if (values[index] == null) return empty;
    if (typeof cx !== "number" || typeof cy !== "number") return empty;
    const isolated = values[index - 1] == null && values[index + 1] == null;
    if (!opts.all && !isolated) return empty;
    return (
      <circle
        key={key}
        cx={cx}
        cy={cy}
        r={opts.radius}
        fill={opts.color}
        stroke={opts.color}
      />
    );
  };
}
