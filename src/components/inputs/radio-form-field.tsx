import type { ReactNode } from "react";
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
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type RadioOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
};

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  options: RadioOption[];
  radioGroupClassName?: string;
  required?: boolean;
  labelClassName?: string;
  onChange?: (value: string) => void;
};

export const RadioFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  options,
  radioGroupClassName,
  required,
  labelClassName,
  onChange,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          {label && (
            <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
          )}
          <FormControl>
            <RadioGroup
              className={radioGroupClassName}
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onChange?.(value);
              }}
              required={required}
            >
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3",
                    opt.className,
                  )}
                >
                  <RadioGroupItem value={opt.value} disabled={opt.disabled} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
