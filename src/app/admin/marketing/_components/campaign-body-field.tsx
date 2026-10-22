"use client";

import type { JSONContent } from "@tiptap/core";
import type { UseFormReturn } from "react-hook-form";
import { useMemo, useState } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";

import type { Audience } from "~/lib/marketing/segments";
import { tiptapToEmailHtml } from "~/lib/marketing/tiptap-to-email";
import { Button } from "~/components/ui/button";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";

import { EmailPreviewFrame, useCampaignPreview } from "./email-preview-frame";

/** Largest serialized message the server accepts (`saveDraft`). */
export const CAMPAIGN_BODY_MAX_JSON_LENGTH = 200_000;

export type CampaignBodyFormValues = {
  subject: string;
  previewText: string;
  /** Tiptap document; plain-text drafts are converted on load. */
  body: JSONContent;
  /** Not used by the body field; part of the composer's form. */
  audience: Audience;
};

/**
 * The campaign's message field, kept on its own so the composer around it
 * doesn't care how the body is edited. It reads and writes the `body` key of
 * the composer form as a tiptap document, in an editor limited to what an
 * email can show, with a live preview of the full email and a warning for
 * anything pasted in that the email will leave out.
 */
export function CampaignBodyField({
  form,
  disabled,
  mediaEnabled,
  productsEnabled,
  baseUrl,
  onUploadingChange,
}: {
  form: UseFormReturn<CampaignBodyFormValues>;
  disabled?: boolean;
  /** Offer "Choose from library" in the image dialog (needs the media flag). */
  mediaEnabled?: boolean;
  /** Offer the "Products" block (needs the products flag). */
  productsEnabled?: boolean;
  /** The store's public URL; page links in the message resolve against it. */
  baseUrl?: string | null;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const body = form.watch("body");
  const previewText = form.watch("previewText");
  const [showPreview, setShowPreview] = useState(false);
  // The full email as it will arrive (header, footer, saved style), rendered
  // by the server; only fetched while the preview is open.
  const preview = useCampaignPreview({
    bodyJson: body,
    previewText,
    enabled: showPreview,
  });
  const walkerWarnings = useMemo(
    () => tiptapToEmailHtml(body, { baseUrl }).warnings,
    [body, baseUrl],
  );
  const warnings = useMemo(
    () => [...new Set([...walkerWarnings, ...preview.warnings])],
    [walkerWarnings, preview.warnings],
  );

  return (
    <div className="space-y-3">
      <MinimalTiptapFormField
        form={form}
        name="body"
        label="Message"
        required
        output="json"
        emailMode
        disabled={disabled}
        mediaEnabled={mediaEnabled}
        productsEnabled={productsEnabled}
        onUploadingChange={onUploadingChange}
        placeholder="Hi there, here's what's new this month…"
        editorContentClassName="min-h-[320px] p-4"
        description="Add headings, lists, links, pictures, buttons, products and space from the toolbar or by typing /. Your business address and an unsubscribe link are added at the bottom automatically."
      />

      {warnings.length > 0 && (
        <div
          role="status"
          className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">
              Some content can&apos;t be shown in email and will be left out:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview((v) => !v)}
          aria-expanded={showPreview}
        >
          {showPreview ? (
            <EyeOff className="mr-2 h-4 w-4" aria-hidden />
          ) : (
            <Eye className="mr-2 h-4 w-4" aria-hidden />
          )}
          {showPreview ? "Hide preview" : "Preview email"}
        </Button>
        {showPreview && (
          <div className="mt-3 space-y-2">
            <EmailPreviewFrame html={preview.html} loading={preview.loading} />
            {preview.error && (
              <p role="alert" className="text-destructive text-sm">
                {preview.error}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Shown with your email style, business address and unsubscribe
              footer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
