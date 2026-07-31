import type { InputHTMLAttributes } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { cn } from "~/lib/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

import { NumberInput } from "../ui/number-input";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: number | null) => void;
  onChangeAdditional?: (value: number | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputId?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  required?: boolean;
  autoFocus?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  min?: number;
  max?: number;
  step?: number | "any";
};

export const NumberFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  placeholder,
  onChange,
  onChangeAdditional,
  onKeyDown,
  onFocus,
  onBlur,
  inputId,
  inputRef,
  required,
  autoFocus,
  labelClassName,
  inputClassName,
  min,
  max,
  step,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ref: _fieldRef, ...fieldRest } = field;
        return (
          <FormItem className={cn("col-span-full", className)}>
            {label && (
              <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
            )}
            <FormControl>
              <NumberInput
                disabled={disabled}
                className={inputClassName}
                placeholder={placeholder ?? ""}
                {...fieldRest}
                ref={(el) => {
                  field.ref(el);
                  if (inputRef) {
                    (
                      inputRef as React.MutableRefObject<HTMLInputElement | null>
                    ).current = el;
                  }
                }}
                onChange={(e) => {
                  if (!!onChangeAdditional) {
                    onChangeAdditional(e);
                  }

                  if (!!onChange) {
                    onChange(e);
                  } else {
                    field.onChange(e);
                  }
                }}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={(e) => {
                  field.onBlur();
                  onBlur?.(e);
                }}
                // See input-form-field: `id={undefined}` would beat the id
                // `FormControl` injects and orphan the label's `for`.
                {...(inputId ? { id: inputId } : {})}
                required={required}
                autoFocus={autoFocus}
                min={min}
                max={max}
                step={step}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
