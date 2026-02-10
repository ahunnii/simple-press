"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trash, Upload } from "lucide-react";

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

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  existingPreviewUrl?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

type InnerProps = {
  field: { value: unknown; onChange: (v: File | null) => void };
  disabled?: boolean;
  existingPreviewUrl?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
  label?: string;
  description?: string;
};

function ImageUploadFormFieldInner({
  field,
  disabled,
  existingPreviewUrl,
  fileInputRef,
  className,
  label,
  description,
}: InnerProps) {
  const value = field.value as File | null | undefined;
  const hasFile = value instanceof File;
  const objectUrl = useObjectUrl(hasFile ? value : null);
  const previewUrl =
    objectUrl ?? (existingPreviewUrl && !hasFile ? existingPreviewUrl : null);

  const triggerFileInput = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled, fileInputRef]);

  return (
    <FormItem className={cn("col-span-full", className)}>
      {label && <FormLabel>{label}</FormLabel>}
      <FormControl>
        <div className="space-y-2">
          <input
            ref={(el) => {
              (
                fileInputRef as React.MutableRefObject<HTMLInputElement | null>
              ).current = el;
            }}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            aria-label={label ?? "Choose image file"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) field.onChange(file);
              e.target.value = "";
            }}
          />
          {previewUrl ? (
            <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={hasFile ? value.name : "Preview"}
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                {hasFile && (
                  <p className="truncate text-sm font-medium">{value.name}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {hasFile
                    ? "New image selected. Upload on submit."
                    : "Existing image."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Remove image"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => {
                  field.onChange(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={triggerFileInput}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {previewUrl ? "Replace image" : "Choose image"}
          </Button>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerFileInput();
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (disabled) return;
              const file = e.dataTransfer.files?.[0];
              if (file && isImageFile(file)) field.onChange(file);
            }}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "border-border border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
              "hover:border-muted-foreground/50 hover:bg-muted/50",
              disabled && "pointer-events-none opacity-50",
            )}
            onClick={triggerFileInput}
          >
            Drag and drop an image here, or click to browse
          </div>
        </div>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}

export const ImageUploadFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  existingPreviewUrl,
  inputRef,
}: Props<CurrentForm>) => {
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = inputRef ?? localInputRef;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <ImageUploadFormFieldInner
          field={field}
          disabled={disabled}
          existingPreviewUrl={existingPreviewUrl}
          fileInputRef={fileInputRef}
          className={className}
          label={label}
          description={description}
        />
      )}
    />
  );
};
