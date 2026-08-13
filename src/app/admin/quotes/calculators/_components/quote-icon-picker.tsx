"use client";

import { useState } from "react";
import { Ban, ChevronDown } from "lucide-react";

import { getQuoteIcon, QUOTE_ICON_NAMES } from "~/lib/quote/quote-icons";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

type Props = {
  /** Lucide icon name from the curated set, or `null` for no icon. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Names the trigger for assistive tech, e.g. "Icon for option 2". */
  label: string;
  disabled?: boolean;
};

/**
 * Icon chooser for a priced option.
 *
 * Deliberately a fixed grid of the 26 curated names rather than a search over
 * all of Lucide: the storefront renders these as large choice-card glyphs, and
 * the curated set is the one that has been checked to read at that size. An
 * icon is optional everywhere — "no icon" is the first cell, not a clear button
 * hidden elsewhere.
 */
export function QuoteIconPicker({ value, onChange, label, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = value ? getQuoteIcon(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={
            SelectedIcon ? `${label}: ${value}` : `${label}: none selected`
          }
        >
          {SelectedIcon ? (
            <SelectedIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown
              className="text-muted-foreground h-4 w-4"
              aria-hidden="true"
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-3">
        <p className="text-muted-foreground mb-2 text-xs">
          Shown on the choice card next to the option label.
        </p>

        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            aria-label="No icon"
            aria-pressed={value === null}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-9 w-9 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none",
              value === null && "border-primary bg-accent",
            )}
          >
            <Ban className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          </button>

          {QUOTE_ICON_NAMES.map((name) => {
            // `getQuoteIcon` is total over this list, but it returns
            // `LucideIcon | null` for callers passing stored strings — narrow
            // rather than assert.
            const Icon = getQuoteIcon(name);
            if (!Icon) return null;
            const selected = value === name;

            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={selected}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-9 w-9 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none",
                  selected && "border-primary bg-accent",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
