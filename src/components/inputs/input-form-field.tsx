import type { InputHTMLAttributes, ReactNode } from "react";
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
import { Input } from "~/components/ui/input";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onChangeAdditional?: (value: string) => void;
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
  descriptionClassName?: string;
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
  onChangeAdditional,
  onKeyDown,
  onFocus,
  onBlur,
  inputId,
  inputRef,
  type,
  required,
  autoFocus,
  labelClassName,
  inputClassName,
  descriptionClassName,
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
              <FormLabel className={cn(labelClassName)}>
                {label}{" "}
                {required && (
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                )}
                {/* {required && (
                  <span className="items-center text-[10px] font-medium tracking-[0.05em] text-red-500">
                    * REQUIRED
                  </span>
                )} */}
              </FormLabel>
            )}
            <FormControl>
              <Input
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
                    onChangeAdditional(e.target.value);
                  }

                  if (!!onChange) {
                    onChange(e.target.value);
                  } else {
                    field.onChange(e.target.value);
                  }
                }}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={(e) => {
                  field.onBlur();
                  onBlur?.(e);
                }}
                // Only override when a caller supplies an explicit id. Passing
                // `id={undefined}` beat the id `FormControl` injects, so every
                // `<FormLabel for=…>` pointed at an element that did not exist
                // and the input counted as unlabeled (axe: `label`, critical).
                {...(inputId ? { id: inputId } : {})}
                // Declared in `Props` from the start but never forwarded, so
                // every `type="email"` / `type="date"` call site was silently a
                // plain text input — no date picker, no email keyboard, no
                // browser-side validation.
                type={type}
                required={required}
                autoFocus={autoFocus}
              />
            </FormControl>
            {description && (
              <FormDescription className={cn(descriptionClassName)}>
                {description}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
