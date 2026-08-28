"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useState } from "react";

import { cn } from "~/lib/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";

type Props<TFieldValues extends FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  description?: string;
  placeholder?: string;
  /**
   * What an emptied input writes back. `"null"` for the nullable bounds
   * (`min`/`max` — clearing one must persist as a removed bound, and Zod's
   * `.nullable()` is what accepts that). `"undefined"` for the required numbers
   * (`value`, `hiddenDefault`), so an empty box reports as "Required" rather
   * than as a type error about null.
   */
  emptyAs?: "null" | "undefined";
  className?: string;
  disabled?: boolean;
  /**
   * Forwarded straight to the `<input type="number">`'s `min`/`max` — the
   * browser's own spinner/validation bounds, purely a UX affordance. The real
   * bound is still whatever the Zod schema enforces server-side; these do not
   * clamp `onChange` and a value outside them still reaches `field.onChange`
   * for the resolver to catch.
   */
  min?: number;
  max?: number;
};

/**
 * A numeric form field for the builder.
 *
 * Deliberately a raw `<Input type="number">` rather than the shared
 * `NumberFormField`/`NumberInput`: that primitive `preventDefault`s the `-`
 * key, and option values here are explicitly allowed to be negative (a discount
 * option) as well as fractional (a 1.5× multiplier). Blocking the minus sign
 * would make a whole class of price model untypeable.
 *
 * The `draft` buffer exists because a controlled number input that round-trips
 * through `Number()` fights the user mid-decimal: typing "1." parses to 1,
 * re-renders as "1", and eats the keystroke. While the field is focused the
 * raw string is shown as typed and the parsed number is what gets committed to
 * form state; on blur the buffer is dropped and the canonical value renders.
 */
export function BuilderNumberField<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  emptyAs = "undefined",
  className,
  disabled,
  min,
  max,
}: Props<TFieldValues>) {
  const [draft, setDraft] = useState<string | null>(null);

  const empty = emptyAs === "null" ? null : undefined;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const committed =
          typeof field.value === "number" && Number.isFinite(field.value)
            ? String(field.value)
            : "";

        return (
          <FormItem className={cn(className)}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                min={min}
                max={max}
                disabled={disabled}
                placeholder={placeholder}
                name={field.name}
                ref={field.ref}
                value={draft ?? committed}
                onChange={(event) => {
                  const raw = event.target.value;
                  setDraft(raw);
                  if (raw.trim() === "") {
                    field.onChange(empty);
                    return;
                  }
                  const parsed = Number(raw);
                  field.onChange(Number.isFinite(parsed) ? parsed : empty);
                }}
                onBlur={() => {
                  setDraft(null);
                  field.onBlur();
                }}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
