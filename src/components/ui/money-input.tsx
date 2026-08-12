import { type ComponentProps } from "react";

import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";

export function MoneyInput({
  onChange,
  value,
  onBlur,
  onKeyDown,
  size,
  className,
  ...props
}: Omit<
  ComponentProps<typeof Input>,
  "type" | "onChange" | "value" | "size"
> & {
  onChange: (value: number | null) => void;
  value: undefined | null | number;
  size?: "sm";
}) {
  return (
    <div className="relative">
      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
        $
      </span>
      <Input
        type="number"
        step="0.01"
        min="0"
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
        onBlur={(e) => {
          if (typeof value === "number") {
            const rounded = Math.round(value * 100) / 100;
            if (rounded !== value) {
              onChange(rounded);
            }
          }
          onBlur?.(e);
        }}
        className={cn("pl-7", size === "sm" && "h-8", className)}
      />
    </div>
  );
}
