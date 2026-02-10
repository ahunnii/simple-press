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
import { Textarea } from "~/components/ui/textarea";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;

  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
};

export const TextareaFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  placeholder,
  defaultValue,
  textareaRef,
  onFocus,
  onBlur,
  rows = 4,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          <FormLabel>{label}</FormLabel>

          <FormControl>
            <div className="space-y-2">
              <Textarea
                disabled={disabled}
                placeholder={placeholder ?? ""}
                defaultValue={defaultValue}
                {...field}
                ref={(el) => {
                  field.ref(el);
                  if (textareaRef) {
                    (
                      textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>
                    ).current = el;
                  }
                }}
                onBlur={(e) => {
                  field.onBlur();
                  onBlur?.(e);
                }}
                onFocus={onFocus}
                rows={rows}
              />
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
