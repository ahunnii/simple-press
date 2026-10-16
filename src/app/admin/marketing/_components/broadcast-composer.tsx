"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Mail,
  Save,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { TrpcFormError } from "~/lib/forms/apply-trpc-error";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import {
  plainTextToTiptapDoc,
  tiptapHasContent,
} from "~/lib/marketing/tiptap-to-email";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { useUploadingState } from "~/components/ui/minimal-tiptap/hooks/use-uploading-state";
import { InputFormField } from "~/components/inputs/input-form-field";

import { pluralize } from "../_lib/format";
import {
  CAMPAIGN_BODY_MAX_JSON_LENGTH,
  CampaignBodyField,
} from "./campaign-body-field";

const LIST_PATH = "/admin/marketing";
const campaignPath = (id: string) => `${LIST_PATH}/campaigns/${id}`;

// Mirrors marketingRouter.saveDraft's input schema (src/server/api/routers/marketing.ts)
// so client-side validation agrees with the server. A draft may be saved with
// an empty message; sending (or a test send) additionally needs one.
const composerSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or fewer"),
  previewText: z
    .string()
    .trim()
    .max(200, "Preview text must be 200 characters or fewer"),
  body: z.custom<JSONContent>(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      (value as { type?: unknown }).type === "doc",
    "Write a message",
  ).refine(
    (doc) => JSON.stringify(doc).length <= CAMPAIGN_BODY_MAX_JSON_LENGTH,
    "The message is too large. Remove some content and try again.",
  ),
});

type ComposerValues = z.infer<typeof composerSchema>;

type Props = {
  /** The saved draft being edited; omitted on `/campaigns/new`. */
  campaign?: {
    id: string;
    subject: string;
    previewText: string | null;
    contentFormat: string;
    bodyText: string | null;
    bodyJson: unknown;
  };
  recipientCount: number;
  /** False when the business has no postal address (blocks Send). */
  hasPostalAddress: boolean;
  /** Offer the media library in the editor's image dialog. */
  mediaEnabled?: boolean;
};

/**
 * The editor's starting document. Drafts written before the rich editor
 * (plain text) are converted here and saved as rich text from then on.
 */
function initialBody(campaign: Props["campaign"]): JSONContent {
  const stored = campaign?.bodyJson;
  if (
    campaign?.contentFormat === "tiptap" &&
    stored &&
    typeof stored === "object" &&
    (stored as { type?: unknown }).type === "doc"
  ) {
    return stored as JSONContent;
  }
  return plainTextToTiptapDoc(campaign?.bodyText);
}

export function BroadcastComposer({
  campaign,
  recipientCount,
  hasPostalAddress,
  mediaEnabled,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const form = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      subject: campaign?.subject ?? "",
      previewText: campaign?.previewText ?? "",
      body: initialBody(campaign),
    },
  });

  // True while an image is still uploading: saving then would store its
  // temporary blob: address, which the email can't show.
  const { isUploading, onUploadingChange } = useUploadingState();
  const { isDirty } = form.formState;
  useDirtyForm(isDirty);

  // The draft this form edits. `/campaigns/new` has none until the first
  // save, which creates it.
  const [draftId, setDraftId] = useState<string | undefined>(campaign?.id);
  const [sendOpen, setSendOpen] = useState(false);

  const saveDraft = api.marketing.saveDraft.useMutation();
  const sendTest = api.marketing.sendTest.useMutation();
  const sendCampaign = api.marketing.sendCampaign.useMutation();
  const deleteDraft = api.marketing.deleteDraft.useMutation();

  const isBusy =
    saveDraft.isPending ||
    sendTest.isPending ||
    sendCampaign.isPending ||
    deleteDraft.isPending;

  const subject = form.watch("subject") ?? "";
  const previewText = form.watch("previewText") ?? "";
  const body = form.watch("body");
  const bodyHasContent = useMemo(() => tiptapHasContent(body), [body]);

  const hasContent = subject.trim() !== "" && bodyHasContent;
  const canSend =
    form.formState.isValid &&
    hasContent &&
    hasPostalAddress &&
    recipientCount > 0 &&
    !isUploading &&
    !isBusy;
  const customers = pluralize(recipientCount, "customer");

  /** Saves the draft (creating it on first save) and re-baselines the form. */
  const persist = async (values: ComposerValues) => {
    const trimmed = {
      subject: values.subject.trim(),
      previewText: values.previewText.trim(),
      body: values.body,
    };
    const { id } = await saveDraft.mutateAsync({
      id: draftId,
      subject: trimmed.subject,
      previewText: trimmed.previewText,
      contentFormat: "tiptap",
      bodyJson: trimmed.body as Record<string, unknown>,
    });
    setDraftId(id);
    form.reset(trimmed);
    void utils.marketing.invalidate();
    return { id, created: draftId === undefined };
  };

  /** After the first save, swap `/campaigns/new` for the draft's own URL. */
  const adoptDraftUrl = (id: string) => {
    router.replace(campaignPath(id));
  };

  const handleSave = form.handleSubmit(async (values) => {
    try {
      const { id, created } = await persist(values);
      toast.success("Draft saved");
      if (created) adoptDraftUrl(id);
    } catch (error) {
      applyTrpcErrorToForm(form, error as TrpcFormError);
    }
  });

  const handleTestSend = form.handleSubmit(async (values) => {
    let createdId: string | null = null;
    try {
      const { id, created } = await persist(values);
      if (created) createdId = id;
      const result = await sendTest.mutateAsync({ id });
      if (result.sent) {
        toast.success(`Test email sent to ${result.to}.`);
      } else {
        toast.error("The test email couldn't be sent. Please try again.");
      }
    } catch (error) {
      applyTrpcErrorToForm(form, error as TrpcFormError);
    } finally {
      if (createdId) adoptDraftUrl(createdId);
    }
  });

  const handleSend = form.handleSubmit(async (values) => {
    try {
      const { id } = await persist(values);
      const result = await sendCampaign.mutateAsync({ id });
      toast.success(
        `Campaign queued for ${result.recipientCount.toLocaleString()} ${pluralize(result.recipientCount, "customer")}. It will finish sending in the background.`,
      );
      setSendOpen(false);
      void utils.marketing.invalidate();
      router.replace(campaignPath(id));
      router.refresh();
    } catch (error) {
      setSendOpen(false);
      applyTrpcErrorToForm(form, error as TrpcFormError);
    }
  });

  const handleDelete = async () => {
    if (!draftId) return;
    try {
      await deleteDraft.mutateAsync({ id: draftId });
      toast.success("Draft deleted");
      form.reset();
      void utils.marketing.invalidate();
      router.push(LIST_PATH);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete draft",
      );
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void handleSave(event)}
        noValidate
        className="bg-muted/40 min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href={LIST_PATH}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 flex-1 basis-0 items-center gap-2 sm:flex">
              <h1 className="truncate text-base font-medium">
                {subject.trim() || "New campaign"}
              </h1>
              <span
                className={cn(
                  "admin-status-badge shrink-0",
                  isDirty ? "isDirty" : "isDraft",
                )}
              >
                {isDirty ? "Unsaved Changes" : "Draft"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <Button type="submit" size="sm" disabled={isBusy || isUploading}>
              {saveDraft.isPending ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  Save draft
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container space-y-6">
          {!hasPostalAddress && (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Business address needed</AlertTitle>
              <AlertDescription>
                Add your business address before sending. The law requires a
                postal address in marketing emails.{" "}
                <Link
                  href="/admin/settings/general"
                  className="font-medium underline underline-offset-2"
                >
                  Go to business settings
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Users
                  className="text-muted-foreground h-4 w-4"
                  aria-hidden="true"
                />
                Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                <span className="font-medium tabular-nums">
                  {recipientCount.toLocaleString()}
                </span>{" "}
                <span className="text-muted-foreground">
                  {customers} opted in to marketing emails will receive this
                  campaign.
                </span>
              </p>
              {recipientCount === 0 && (
                <p className="text-muted-foreground mt-2 text-sm">
                  No customers have opted in yet, so this can be saved as a
                  draft but not sent.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Mail
                  className="text-muted-foreground h-4 w-4"
                  aria-hidden="true"
                />
                Compose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <InputFormField
                form={form}
                name="subject"
                label="Subject"
                placeholder="Your monthly update from us"
                disabled={isBusy}
                required
                description={`${subject.length.toString()}/200 characters`}
                descriptionClassName="text-xs"
              />

              <InputFormField
                form={form}
                name="previewText"
                label="Preview text (optional)"
                placeholder="A short teaser of what's inside"
                disabled={isBusy}
                description={`Shown next to the subject in most inboxes. ${previewText.length.toString()}/200 characters`}
                descriptionClassName="text-xs"
              />

              <CampaignBodyField
                form={form}
                disabled={saveDraft.isPending || sendCampaign.isPending}
                mediaEnabled={mediaEnabled}
                onUploadingChange={onUploadingChange}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleTestSend()}
                disabled={
                  !form.formState.isValid ||
                  !hasContent ||
                  isUploading ||
                  isBusy
                }
              >
                {sendTest.isPending ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Send test to myself
              </Button>

              {draftId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={isBusy}
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Delete draft
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the draft. It hasn&apos;t been
                        sent to anyone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteDraft.isPending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-white"
                        onClick={() => void handleDelete()}
                        disabled={deleteDraft.isPending}
                      >
                        Delete draft
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={!canSend}>
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                  Send to {recipientCount.toLocaleString()} {customers}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Send to {recipientCount.toLocaleString()} {customers}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{subject.trim() || "Your email"}&rdquo; will be
                    queued now and go out over the next few minutes to every
                    customer who opted in to marketing emails. You can follow
                    its progress from the campaign page. Emails already
                    delivered can&apos;t be taken back.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={sendCampaign.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  {/* A plain Button, not AlertDialogAction: the dialog stays
                      open (and busy) until the campaign is actually queued. */}
                  <Button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sendCampaign.isPending || saveDraft.isPending}
                  >
                    {sendCampaign.isPending || saveDraft.isPending ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Send campaign
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </form>
    </Form>
  );
}
