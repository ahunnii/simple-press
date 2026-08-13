"use client";

import type { Content } from "@tiptap/react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import * as React from "react";
import { uploadFile } from "@better-upload/client";

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

/**
 * Uploads a richtext image to S3 via the generic `/api/upload` "image"
 * route and returns its public URL. This is the default `uploader` for
 * every MinimalTiptapFormField consumer (blog, pages, product
 * descriptions, announcements, policies, etc.) so CMS richtext images no
 * longer get stored as base64 data URIs in the DB.
 *
 * Note: the "image" route's `onBeforeUpload` returns metadata under the
 * lowercase `pathname` key (other /api/upload routes use `pathName` —
 * the casing is inconsistent across routes, so this must match exactly).
 * The route already scopes the upload to the caller's business via
 * `checkBusiness()` / membership check server-side — no businessId needs
 * to be threaded through here.
 */
export async function uploadRichTextImage(file: File): Promise<string> {
  const result = await uploadFile({
    api: "/api/upload",
    route: "image",
    file,
  });

  const url = result.file.objectInfo.metadata?.pathname as
    | string
    | undefined;

  if (!url) {
    throw new Error("Upload succeeded but no file URL was returned.");
  }

  return url;
}

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  editorContentClassName?: string;
  /** TipTap output format. Use "json" for ProseMirror JSON (recommended for DB). */
  output?: "html" | "json" | "text";
  businessId?: string;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  required?: boolean;
  /**
   * Image upload function passed to the editor. Defaults to an S3 uploader
   * (via `/api/upload`'s "image" route) so richtext images are never stored
   * as base64 in the DB. Override only if a call site needs different
   * upload behavior (e.g. a different route/scoping).
   */
  uploader?: (file: File) => Promise<string>;
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
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  required,
  uploader,
}: Props<CurrentForm>) => {
  // Stable reference so useMinimalTiptapEditor's extensions memo (keyed on
  // `uploader`) doesn't recreate the editor every render.
  const resolvedUploader = React.useCallback(
    (file: File) => (uploader ?? uploadRichTextImage)(file),
    [uploader],
  );

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = (field.value ?? EMPTY_TIPTAP_DOC) as unknown as Content;
        return (
          <FormItem className={cn("col-span-full", className)}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className="text-red-500">*</span>}
              </FormLabel>
            )}
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
                galleriesEnabled={galleriesEnabled}
                embedsEnabled={embedsEnabled}
                quotesEnabled={quotesEnabled}
                uploader={resolvedUploader}
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
