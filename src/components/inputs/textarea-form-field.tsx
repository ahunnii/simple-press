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
  maxLength?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  labelClassName?: string;
  required?: boolean;
  messageLength?: number;

  textareaClassName?: string;
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
  labelClassName,
  maxLength,
  required,
  rows = 4,
  messageLength,

  textareaClassName,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
          {maxLength && (
            <span className="text-xs text-gray-500">
              {messageLength ?? 0}/{maxLength ?? 0}
            </span>
          )}
          <FormControl>
            <div className="space-y-2">
              <Textarea
                disabled={disabled}
                className={textareaClassName}
                maxLength={maxLength}
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
                required={required}
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
