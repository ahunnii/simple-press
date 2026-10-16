"use client";

import { useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import type { UseFormReturn } from "react-hook-form";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";

import { tiptapToEmailHtml } from "~/lib/marketing/tiptap-to-email";
import { Button } from "~/components/ui/button";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";

import { EmailBodyPreview } from "./email-body-preview";

/** Largest serialized message the server accepts (`saveDraft`). */
export const CAMPAIGN_BODY_MAX_JSON_LENGTH = 200_000;

export type CampaignBodyFormValues = {
  subject: string;
  previewText: string;
  /** Tiptap document; plain-text drafts are converted on load. */
  body: JSONContent;
};

/**
 * The campaign's message field, kept on its own so the composer around it
 * doesn't care how the body is edited. It reads and writes the `body` key of
 * the composer form as a tiptap document, in an editor limited to what an
 * email can show, with a live preview of the rendered email and a warning for
 * anything pasted in that the email will leave out.
 */
export function CampaignBodyField({
  form,
  disabled,
  mediaEnabled,
  onUploadingChange,
}: {
  form: UseFormReturn<CampaignBodyFormValues>;
  disabled?: boolean;
  /** Offer "Choose from library" in the image dialog (needs the media flag). */
  mediaEnabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const body = form.watch("body");
  const [showPreview, setShowPreview] = useState(false);
  const warnings = useMemo(() => tiptapToEmailHtml(body).warnings, [body]);

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
        onUploadingChange={onUploadingChange}
        placeholder="Hi there, here's what's new this month…"
        editorContentClassName="min-h-[320px] p-4"
        description="Headings, lists, links, images and colors are supported. Your business address and an unsubscribe link are added at the bottom automatically."
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
          <div className="mt-3">
            <EmailBodyPreview doc={body} />
          </div>
        )}
      </div>
    </div>
  );
}
