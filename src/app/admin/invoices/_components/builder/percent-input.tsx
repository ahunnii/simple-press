import { type ComponentProps } from "react";

import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";

/**
 * A percent-denominated number input, mirroring `~/components/ui/money-input`
 * exactly (same prop shape, same "spread the rest onto the real `<input>`"
 * trick) so `<FormControl>`'s `Slot` can still wire `id`/`aria-describedby`
 * onto the actual control rather than the wrapping `<div>` — see
 * `MoneyInput` for why that only works when the unrecognized props land on
 * the `<input>` itself.
 *
 * `value`/`onChange` are the plain percent a person types (e.g. `6.25`), not
 * basis points — callers convert with `~/money`'s `bpsToPercentInputValue` /
 * `percentInputValueToBps`.
 */
export function PercentInput({
  onChange,
  value,
  onBlur,
  onKeyDown,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "onChange" | "value" | "max"> & {
  onChange: (value: number | null) => void;
  value: undefined | null | number;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        step="0.01"
        min="0"
        max="100"
        inputMode="decimal"
        {...props}
        value={value ?? ""}
        onChange={(e) => {
          const number = e.target.valueAsNumber;
          onChange(isNaN(number) ? null : number);
        }}
        onKeyDown={(e) => {
          if (
            e.key === "-" ||
            e.key === "+" ||
            e.key === "e" ||
            e.key === "E"
          ) {
            e.preventDefault();
          }
          onKeyDown?.(e);
        }}
        onBlur={onBlur}
        className={cn(
          // Hide native number spinners (Chrome/Safari + Firefox) so this
          // matches `MoneyInput`, which hides them the same way — otherwise
          // the two numeric inputs on the same form look inconsistent.
          "[appearance:textfield] pr-7 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
      />
      <span
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm"
      >
        %
      </span>
    </div>
  );
}
