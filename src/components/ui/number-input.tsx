import { type ComponentProps } from "react";

import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";

export function NumberInput({
  onChange,
  value,
  onKeyDown,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "onChange" | "value"> & {
  onChange: (value: number | null) => void;
  value: undefined | null | number;
}) {
  return (
    <Input
      {...props}
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
      value={value ?? ""}
      type="number"
    />
  );
}

export function InputGroupNumberInput({
  className,
  ...props
}: React.ComponentProps<typeof NumberInput>) {
  return (
    <NumberInput
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
