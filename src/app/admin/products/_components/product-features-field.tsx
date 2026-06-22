"use client";

import type { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type { ProductFormSchema } from "~/lib/validators/product";
import {
  getLucideTemplateIcon,
  TEMPLATE_LUCIDE_ICON_NAMES,
} from "~/lib/lucide-template-icons";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Props = {
  form: UseFormReturn<ProductFormSchema>;
  className?: string;
};

export function ProductFeaturesField({ form, className }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalFields.productFeatures",
  });

  return (
    <div className={cn("col-span-full space-y-3", className)}>
      <div>
        <FormLabel>Product features</FormLabel>
        <FormDescription>
          Short labels with an icon (shown on the product page).
        </FormDescription>
      </div>

      {fields.length === 0 && (
        <p className="text-muted-foreground text-sm">No features yet.</p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-muted/80 p-4 sm:flex-row sm:items-end"
        >
          <FormField
            control={form.control}
            name={`additionalFields.productFeatures.${index}.icon`}
            render={({ field: iconField }) => {
              const Preview = getLucideTemplateIcon(iconField.value ?? "");
              return (
                <FormItem className="flex-1 space-y-2">
                  <FormLabel className="text-xs text-muted-foreground">Icon</FormLabel>
                  <div className="flex items-center gap-2">
                    {Preview ? (
                      <Preview className="text-muted-foreground h-5 w-5 shrink-0" />
                    ) : null}
                    <Select
                      value={iconField.value}
                      onValueChange={iconField.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEMPLATE_LUCIDE_ICON_NAMES.map((name) => {
                          const Icon = getLucideTemplateIcon(name);
                          return (
                            <SelectItem key={name} value={name}>
                              <span className="flex items-center gap-2">
                                {Icon ? (
                                  <Icon className="h-4 w-4 shrink-0" />
                                ) : null}
                                {name}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name={`additionalFields.productFeatures.${index}.text`}
            render={({ field: textField }) => (
              <FormItem className="min-w-0 flex-[2] space-y-2">
                <FormLabel className="text-xs text-muted-foreground">Label</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Septic Safe" {...textField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive/80"
            aria-label="Remove feature"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            icon: TEMPLATE_LUCIDE_ICON_NAMES[0],
            text: "",
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add feature
      </Button>
    </div>
  );
}
