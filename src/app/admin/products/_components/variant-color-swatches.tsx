"use client";

import type { FormVariant } from "../_validators/schema";
import type { ColorSwatches } from "~/lib/products/color-swatches";
import {
  BASE_PRODUCT_COLORS,
  colorOptionValues,
  matchColorName,
  swatchOverrideFor,
} from "~/lib/products/color-swatches";
import { cn } from "~/lib/utils";

import { SwatchColorControl } from "./swatch-color-control";

type Props = {
  variants: FormVariant[];
  value: ColorSwatches;
  onChange: (next: ColorSwatches) => void;
};

/** `map` minus every key for `name`, matched as the storefront reads them. */
function withoutName(map: ColorSwatches, name: string): ColorSwatches {
  const wanted = name.trim().toLowerCase();
  const next: ColorSwatches = {};
  for (const [key, hex] of Object.entries(map)) {
    if (key.trim().toLowerCase() !== wanted) next[key] = hex;
  }
  return next;
}

/**
 * One row per distinct color value across the product's variants: the dot
 * the storefront will draw, and a picker to override it. Unset rows follow
 * the name match (`BASE_PRODUCT_COLORS`); names nothing matches stay
 * unknown. Always emits a whole new map — color names can contain "." and
 * spaces, so callers must never write them as per-key form paths.
 */
export function VariantColorSwatches({ variants, value, onChange }: Props) {
  const names = colorOptionValues(variants);
  if (names.length === 0) return null;

  const setColor = (name: string, hex: string | null) => {
    const next = withoutName(value, name);
    if (hex) next[name] = hex.toLowerCase();
    onChange(next);
  };

  return (
    <ul className="divide-y rounded-lg border">
      {names.map((name) => {
        const custom = swatchOverrideFor(value, name) ?? null;
        const auto = matchColorName(BASE_PRODUCT_COLORS, name);
        const shown = custom ?? auto;
        const caption = custom
          ? "Custom"
          : auto
            ? "Automatic"
            : "No automatic match";

        return (
          <li
            key={name}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden="true"
                data-testid="swatch-dot"
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full border",
                  !shown &&
                    "border-muted-foreground/60 text-muted-foreground border-dashed",
                )}
                style={
                  shown
                    ? { backgroundColor: shown }
                    : {
                        backgroundImage:
                          "repeating-linear-gradient(45deg, transparent 0 4px, color-mix(in srgb, currentColor 35%, transparent) 4px 6px)",
                      }
                }
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-muted-foreground text-xs">{caption}</p>
              </div>
            </div>
            <SwatchColorControl
              value={custom}
              autoColor={auto}
              onChange={(hex) => setColor(name, hex)}
              label={`Color for ${name}`}
              emptyLabel="Auto"
              clearLabel="Use auto"
            />
          </li>
        );
      })}
    </ul>
  );
}
