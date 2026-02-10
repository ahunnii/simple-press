"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  File as FileIcon,
  FileText,
  ImageIcon,
  Trash,
  Upload,
} from "lucide-react";

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
  accept?: string;
  fileTypes?: "image" | "document" | "all";
};

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function isDocumentFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(pdf|doc|docx)$/i.test(file.name)
  );
}

function isDirectFileUrl(url: string): boolean {
  // Check if URL ends with a file extension (image or document)
  const fileExtensionPattern =
    /\.(jpg|jpeg|png|gif|webp|bmp|pdf|doc|docx)(\?.*)?$/i;
  return fileExtensionPattern.test(url);
}

function getFileIcon(file: File | null): React.ReactNode {
  if (!file) return <FileIcon className="h-5 w-5" />;
  if (isImageFile(file)) return <ImageIcon className="h-5 w-5" />;
  if (isDocumentFile(file)) return <FileText className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    if (isImageFile(file)) {
      const u = URL.createObjectURL(file);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
  }, [file]);
  return url;
}

function getAcceptString(fileTypes?: "image" | "document" | "all"): string {
  if (fileTypes === "image") return "image/*";
  if (fileTypes === "document")
    return "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx";
  return "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx";
}

type InnerProps = {
  field: { value: unknown; onChange: (v: File | null) => void };
  disabled?: boolean;
  existingPreviewUrl?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
  label?: string;
  description?: string;
  accept?: string;
  fileTypes?: "image" | "document" | "all";
};

function FileUploadFormFieldInner({
  field,
  disabled,
  existingPreviewUrl,
  fileInputRef,
  className,
  label,
  description,
  accept: acceptProp,
  fileTypes = "all",
}: InnerProps) {
  const value = field.value as File | null | undefined;
  const hasFile = value instanceof File;
  const objectUrl = useObjectUrl(hasFile ? value : null);
  // Only show existingPreviewUrl if it's a direct file link, not a website URL
  const isExistingFileUrl =
    existingPreviewUrl && !hasFile && isDirectFileUrl(existingPreviewUrl);
  const previewUrl =
    objectUrl ?? (isExistingFileUrl ? existingPreviewUrl : null);
  const accept = acceptProp ?? getAcceptString(fileTypes);

  const triggerFileInput = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled, fileInputRef]);

  const isValidFile = (file: File): boolean => {
    if (fileTypes === "image") return isImageFile(file);
    if (fileTypes === "document") return isDocumentFile(file);
    return isImageFile(file) || isDocumentFile(file);
  };

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
            accept={accept}
            className="hidden"
            disabled={disabled}
            aria-label={label ?? "Choose file"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && isValidFile(file)) {
                field.onChange(file);
              }
              e.target.value = "";
            }}
          />
          {previewUrl || hasFile || isExistingFileUrl ? (
            <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
              {previewUrl ? (
                // Image preview (from object URL or existing image file URL)
                <img
                  src={previewUrl}
                  alt={hasFile ? value.name : "Preview"}
                  className="h-20 w-20 shrink-0 rounded-md object-cover"
                />
              ) : hasFile && isImageFile(value) ? (
                // Image file selected but no preview yet
                <div className="bg-muted-foreground/10 flex h-20 w-20 shrink-0 items-center justify-center rounded-md">
                  <ImageIcon className="text-muted-foreground h-8 w-8" />
                </div>
              ) : hasFile && isDocumentFile(value) ? (
                // Document file preview
                <div className="bg-muted-foreground/10 flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-md border-2 border-dashed">
                  {getFileIcon(value)}
                  <span className="text-muted-foreground mt-1 text-[10px] font-medium">
                    {value.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
              ) : isExistingFileUrl ? (
                // Existing direct file URL - check if it's an image or document
                /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(
                  existingPreviewUrl,
                ) ? (
                  <img
                    src={existingPreviewUrl}
                    alt="Existing file"
                    className="h-20 w-20 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="bg-muted-foreground/10 flex h-20 w-20 shrink-0 items-center justify-center rounded-md">
                    <FileIcon className="text-muted-foreground h-8 w-8" />
                  </div>
                )
              ) : (
                // Fallback
                <div className="bg-muted-foreground/10 flex h-20 w-20 shrink-0 items-center justify-center rounded-md">
                  {getFileIcon(hasFile ? value : null)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {hasFile && (
                  <>
                    <p className="truncate text-sm font-medium">{value.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {isImageFile(value)
                        ? "Image file"
                        : isDocumentFile(value)
                          ? `Document (${(value.size / 1024).toFixed(1)} KB)`
                          : `${(value.size / 1024).toFixed(1)} KB`}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      New file selected. Upload on submit.
                    </p>
                  </>
                )}
                {!hasFile && isExistingFileUrl && (
                  <>
                    <p className="truncate text-sm font-medium">
                      {existingPreviewUrl.split("/").pop()?.split("?")[0] ??
                        "Existing file"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Existing file.
                    </p>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Remove file"
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
            {previewUrl || hasFile || isExistingFileUrl
              ? "Replace file"
              : "Choose file"}
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
              if (file && isValidFile(file)) field.onChange(file);
            }}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "border-border border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
              "hover:border-muted-foreground/50 hover:bg-muted/50",
              disabled && "pointer-events-none opacity-50",
            )}
            onClick={triggerFileInput}
          >
            {fileTypes === "image"
              ? "Drag and drop an image here, or click to browse"
              : fileTypes === "document"
                ? "Drag and drop a document (PDF, DOC, DOCX) here, or click to browse"
                : "Drag and drop a file (image, PDF, DOC, DOCX) here, or click to browse"}
          </div>
        </div>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}

export const FileUploadFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  existingPreviewUrl,
  inputRef,
  accept,
  fileTypes = "all",
}: Props<CurrentForm>) => {
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = inputRef ?? localInputRef;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FileUploadFormFieldInner
          field={field}
          disabled={disabled}
          existingPreviewUrl={existingPreviewUrl}
          fileInputRef={fileInputRef}
          className={className}
          label={label}
          description={description}
          accept={accept}
          fileTypes={fileTypes}
        />
      )}
    />
  );
};
