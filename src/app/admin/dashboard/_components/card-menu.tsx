"use client";

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Settings2,
  Trash2,
} from "lucide-react";

import type { CardMove, CardPatch } from "./use-dashboard-editor";
import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import { DASHBOARD_RANGES, isDashboardRangeKey } from "~/lib/dashboard/ranges";
import {
  effectiveCompare,
  getWidget,
  resolveCardRange,
} from "~/lib/dashboard/widgets";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { cardLabel, sizeHint, sizeLabel } from "./edit-labels";
import { Footprint } from "./footprint";

/** Keep the menu open after a setting change so several can be tweaked at once. */
const keepOpen = (event: Event) => event.preventDefault();

const SECTION_LABEL = "text-muted-foreground text-xs font-normal";

/**
 * Edit-mode settings for one card: size, time range, comparison, position,
 * remove. Size / range / compare edit the draft immediately, so the card
 * re-queries (new `toCardDataInput` key) and shows live data before saving.
 */
export function CardMenu({
  card,
  index,
  count,
  onUpdate,
  onMove,
  onRemove,
}: {
  card: DashboardCard;
  index: number;
  count: number;
  onUpdate: (patch: CardPatch) => void;
  onMove: (move: CardMove) => void;
  onRemove: () => void;
}) {
  const def = getWidget(card.widget);
  const label = cardLabel(card);
  const range = resolveCardRange(def, card.range);
  const showCompare = def.supportsComparison && !def.isPointInTime;
  const isFirst = index === 0;
  const isLast = index === count - 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          aria-label={`Card settings for ${label}`}
          data-card-settings={card.id}
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className={SECTION_LABEL}>Size</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={card.size}
          onValueChange={(value) => {
            const size = def.sizes.find((s) => s === value);
            if (size) onUpdate({ size });
          }}
        >
          {def.sizes.map((size) => {
            const hint = sizeHint(def, size);
            return (
              <DropdownMenuRadioItem
                key={size}
                value={size}
                onSelect={keepOpen}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span>{sizeLabel(size)}</span>
                  {hint && (
                    <span className="text-muted-foreground text-xs">
                      {hint}
                    </span>
                  )}
                </span>
                <Footprint size={size} />
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>

        {def.supportsRange && range && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className={SECTION_LABEL}>
              Time range
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={range}
              onValueChange={(value) => {
                if (
                  isDashboardRangeKey(value) &&
                  def.allowedRanges.includes(value)
                ) {
                  onUpdate({ range: value });
                }
              }}
            >
              {DASHBOARD_RANGES.filter((r) =>
                def.allowedRanges.includes(r.key),
              ).map((r) => (
                <DropdownMenuRadioItem
                  key={r.key}
                  value={r.key}
                  onSelect={keepOpen}
                >
                  {r.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}

        {showCompare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={effectiveCompare(card, def)}
              disabled={range === "all"}
              onCheckedChange={(checked) => onUpdate({ compare: checked })}
              onSelect={keepOpen}
            >
              <span className="flex flex-col">
                <span>Compare to previous period</span>
                {range === "all" && (
                  <span className="text-muted-foreground text-xs">
                    All time has no earlier period to compare.
                  </span>
                )}
              </span>
            </DropdownMenuCheckboxItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className={SECTION_LABEL}>
            Position {index + 1} of {count}
          </DropdownMenuLabel>
          <DropdownMenuItem disabled={isFirst} onSelect={() => onMove("start")}>
            <ArrowUpToLine aria-hidden="true" />
            Move to start
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isFirst}
            onSelect={() => onMove("earlier")}
          >
            <ArrowUp aria-hidden="true" />
            Move earlier
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => onMove("later")}>
            <ArrowDown aria-hidden="true" />
            Move later
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => onMove("end")}>
            <ArrowDownToLine aria-hidden="true" />
            Move to end
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          <Trash2 aria-hidden="true" />
          Remove card
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
