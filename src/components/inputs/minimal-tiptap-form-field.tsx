"use client";

import type { Content } from "@tiptap/react";
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
import { MinimalTiptapEditor } from "~/components/ui/minimal-tiptap";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] } as const;

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  editorContentClassName?: string;
  /** TipTap output format. Use "json" for ProseMirror JSON (recommended for DB). */
  output?: "html" | "json" | "text";
  businessId?: string;
};

export const MinimalTiptapFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  placeholder,
  editorContentClassName,
  output = "json",
  businessId,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = (field.value ?? EMPTY_TIPTAP_DOC) as unknown as Content;
        return (
          <FormItem className={cn("col-span-full", className)}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <MinimalTiptapEditor
                value={value}
                onChange={field.onChange}
                output={output}
                placeholder={placeholder ?? "Start writing…"}
                editable={!disabled}
                className="w-full"
                editorContentClassName={editorContentClassName}
                editorClassName="focus:outline-hidden"
                businessId={businessId}
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
