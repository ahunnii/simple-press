import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  values: {
    value: string;
    label: string | React.ReactNode;
    isDisabled?: boolean;
  }[];
  onValueChange?: (value: string) => void;
  defaultValue?: string;
};

export const SelectFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  placeholder,
  values,
  onValueChange,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Select
              disabled={disabled}
              onValueChange={(e) => {
                onValueChange?.(e);
                field.onChange(e);
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger disabled={disabled} className="w-full">
                  <SelectValue
                    placeholder={placeholder ?? "Select an option"}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {values.map((value) => (
                  <SelectItem
                    key={value.value}
                    value={value.value}
                    disabled={value.isDisabled}
                  >
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
