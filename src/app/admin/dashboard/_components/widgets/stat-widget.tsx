import type { WidgetProps } from "./types";

import { DeltaChip } from "../delta-chip";
import { formatStatValue } from "../format";
import { Sparkline } from "./sparkline";

/** Number card: value, comparison chip, detail lines, note; sparkline at 2x1. */
export function StatWidget({ card, def, data }: WidgetProps<"stat">) {
  const showSparkline =
    card.size === "2x1" && !!data.series && data.series.length > 1;

  return (
    <div className="flex min-h-0 flex-1 items-start gap-4">
      <div className="min-w-0 space-y-1">
        <div className="text-2xl font-bold tabular-nums">
          {data.value === null ? (
            <span className="text-muted-foreground">&mdash;</span>
          ) : (
            formatStatValue(data.value, data.format)
          )}
        </div>
        {data.value !== null &&
          data.previous !== null &&
          data.comparisonLabel && (
            <DeltaChip
              current={data.value}
              previous={data.previous}
              label={data.comparisonLabel}
              polarity={def.deltaPolarity}
            />
          )}
        {data.detail.length > 0 && (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            {data.detail.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        {data.note && (
          <p className="text-muted-foreground/80 text-xs">{data.note}</p>
        )}
      </div>
      {showSparkline && data.series && (
        <Sparkline series={data.series} label={`${def.label} trend`} />
      )}
    </div>
  );
}
