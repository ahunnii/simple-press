import type { InputHTMLAttributes } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputId?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
};

export const InputFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  placeholder,

  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  inputId,
  inputRef,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const { ref: _fieldRef, ...fieldRest } = field;
        return (
          <FormItem className={cn("col-span-full", className)}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Input
                disabled={disabled}
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
                  if (!!onChange) {
                    onChange(e.target.value);
                  }
                  field.onChange(e.target.value);
                }}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={(e) => {
                  field.onBlur();
                  onBlur?.(e);
                }}
                id={inputId}
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
