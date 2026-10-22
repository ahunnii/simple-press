"use client";

import type { JSONContent } from "@tiptap/core";
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
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

import type { AudienceProduct } from "./audience-product-picker-dialog";
import type { TrpcFormError } from "~/lib/forms/apply-trpc-error";
import type { Audience } from "~/lib/marketing/segments";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { findPlaceholders } from "~/lib/marketing/placeholders";
import {
  audienceSchema,
  DEFAULT_AUDIENCE,
  describeAudience,
} from "~/lib/marketing/segments";
import {
  plainTextToTiptapDoc,
  tiptapHasContent,
} from "~/lib/marketing/tiptap-to-email";
import { countEmptyProductBlocks } from "~/lib/tiptap/email-products-node";
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

import { formatCampaignInstant, pluralize } from "../_lib/format";
import { AudienceSelector, useAudienceCount } from "./audience-selector";
import {
  CAMPAIGN_BODY_MAX_JSON_LENGTH,
  CampaignBodyField,
} from "./campaign-body-field";
import { PlaceholderNote } from "./placeholder-note";
import { ScheduleDialog } from "./schedule-dialog";

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
  body: z
    .custom<JSONContent>(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        (value as { type?: unknown }).type === "doc",
      "Write a message",
    )
    .refine(
      (doc) => JSON.stringify(doc).length <= CAMPAIGN_BODY_MAX_JSON_LENGTH,
      "The message is too large. Remove some content and try again.",
    ),
  audience: audienceSchema,
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
    /** The saved segment; omitted = everyone opted in. */
    audience?: Audience;
    /** Product names for a "bought" segment's ids. */
    audienceProductNames?: Record<string, string>;
  };
  /** A starter layout to open a NEW campaign with (nothing is saved yet). */
  starter?: {
    subject: string;
    previewText: string;
    doc: JSONContent;
  };
  /** Everyone opted in (the unsegmented audience), for the first paint. */
  recipientCount: number;
  /** The store's IANA time zone, for scheduling. */
  timeZone: string;
  /** False when the business has no postal address (blocks Send). */
  hasPostalAddress: boolean;
  /** Offer the media library in the editor's image dialog. */
  mediaEnabled?: boolean;
  /** Offer the "Products" block in the editor (needs the products flag). */
  productsEnabled?: boolean;
  /** The store's public URL, for resolving page links in the preview. */
  baseUrl?: string | null;
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
  starter,
  recipientCount,
  timeZone,
  hasPostalAddress,
  mediaEnabled,
  productsEnabled,
  baseUrl,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const productBlockHintId = useId();

  const form = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      subject: campaign?.subject ?? starter?.subject ?? "",
      previewText: campaign?.previewText ?? starter?.previewText ?? "",
      body: campaign || !starter ? initialBody(campaign) : starter.doc,
      audience: campaign?.audience ?? DEFAULT_AUDIENCE,
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  // Names for the products in a "bought" segment (chips + the audience label).
  const [productNames, setProductNames] = useState<Record<string, string>>(
    campaign?.audienceProductNames ?? {},
  );

  const saveDraft = api.marketing.saveDraft.useMutation();
  const sendTest = api.marketing.sendTest.useMutation();
  const sendCampaign = api.marketing.sendCampaign.useMutation();
  const scheduleCampaign = api.marketing.scheduleCampaign.useMutation();
  const deleteDraft = api.marketing.deleteDraft.useMutation();

  const isBusy =
    saveDraft.isPending ||
    sendTest.isPending ||
    sendCampaign.isPending ||
    scheduleCampaign.isPending ||
    deleteDraft.isPending;

  const subject = form.watch("subject") ?? "";
  const previewText = form.watch("previewText") ?? "";
  const body = form.watch("body");
  const audience = form.watch("audience");
  const bodyHasContent = useMemo(() => tiptapHasContent(body), [body]);
  // A product block with nothing chosen renders nothing and blocks the send
  // (server-side too), so say so before the owner hits a disabled button.
  const hasEmptyProductBlock = useMemo(
    () => countEmptyProductBlocks(body) > 0,
    [body],
  );
  // Starter "[placeholders]" left in: a heads-up, never a block.
  const placeholders = useMemo(
    () => findPlaceholders({ subject, previewText, bodyJson: body }),
    [subject, previewText, body],
  );

  const {
    count: audienceCount,
    loading: audienceLoading,
    isError: audienceCountFailed,
  } = useAudienceCount(audience, recipientCount);
  const audienceLabel = describeAudience(audience, productNames);
  const audienceError = (
    form.formState.errors.audience as unknown as
      | { productIds?: { message?: string } }
      | undefined
  )?.productIds?.message;

  const hasContent = subject.trim() !== "" && bodyHasContent;
  const canSend =
    form.formState.isValid &&
    hasContent &&
    hasPostalAddress &&
    audienceCount !== null &&
    audienceCount > 0 &&
    !audienceLoading &&
    !hasEmptyProductBlock &&
    !isUploading &&
    !isBusy;
  const people = pluralize(audienceCount ?? 0, "person", "people");

  const changeAudience = (next: Audience) =>
    form.setValue("audience", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  const rememberProducts = (products: AudienceProduct[]) =>
    setProductNames((current) => ({
      ...current,
      ...Object.fromEntries(products.map((p) => [p.id, p.name])),
    }));
  /** Saves the draft (creating it on first save) and re-baselines the form. */
  const persist = async (values: ComposerValues) => {
    const trimmed = {
      subject: values.subject.trim(),
      previewText: values.previewText.trim(),
      body: values.body,
      audience: values.audience,
    };
    const { id } = await saveDraft.mutateAsync({
      id: draftId,
      subject: trimmed.subject,
      previewText: trimmed.previewText,
      contentFormat: "tiptap",
      bodyJson: trimmed.body as Record<string, unknown>,
      audience: trimmed.audience,
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
        `Campaign queued for ${result.recipientCount.toLocaleString()} ${pluralize(result.recipientCount, "person", "people")}. It will finish sending in the background.`,
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

  /**
   * Saves pending changes, then schedules the draft. Returns nothing: on
   * failure the message lands in `scheduleError` for the dialog to show.
   */
  const handleSchedule = async (scheduledAt: Date) => {
    setScheduleError(null);
    let reached = false;
    await form.handleSubmit(async (values) => {
      reached = true;
      try {
        const { id } = await persist(values);
        await scheduleCampaign.mutateAsync({ id, scheduledAt });
        toast.success(
          `Scheduled for ${formatCampaignInstant(scheduledAt, timeZone)}.`,
        );
        setScheduleOpen(false);
        void utils.marketing.invalidate();
        router.replace(campaignPath(id));
        router.refresh();
      } catch (error) {
        setScheduleError(
          error instanceof Error && error.message
            ? error.message
            : "Couldn't schedule the campaign. Please try again.",
        );
      }
    })();
    if (!reached) {
      setScheduleError("Fix the highlighted fields first, then try again.");
    }
  };

  const handleScheduleOpenChange = (open: boolean) => {
    setScheduleOpen(open);
    if (open) {
      setScheduleError(null);
    } else if (draftId && !campaign) {
      // A failed attempt may have created the draft: move off /campaigns/new.
      adoptDraftUrl(draftId);
    }
  };

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
                Add a full mailing address before sending: a street, city, and
                state or ZIP, or a PO box. The law requires a postal address in
                marketing emails.{" "}
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
              <AudienceSelector
                value={audience}
                onChange={changeAudience}
                productNames={productNames}
                onProductsPicked={rememberProducts}
                productsEnabled={productsEnabled}
                count={audienceCount}
                loading={audienceLoading}
                countFailed={audienceCountFailed}
                error={audienceError}
                disabled={isBusy}
              />
              {recipientCount === 0 && (
                <p className="text-muted-foreground mt-3 text-sm">
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
                productsEnabled={productsEnabled}
                baseUrl={baseUrl}
                onUploadingChange={onUploadingChange}
              />
            </CardContent>
          </Card>

          <PlaceholderNote placeholders={placeholders} />

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

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!canSend}
                aria-describedby={
                  hasEmptyProductBlock ? productBlockHintId : undefined
                }
                onClick={() => handleScheduleOpenChange(true)}
              >
                <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
                Schedule…
              </Button>

              <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={!canSend}
                    aria-describedby={
                      hasEmptyProductBlock ? productBlockHintId : undefined
                    }
                  >
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Send now
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Send to {(audienceCount ?? 0).toLocaleString()} {people}?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2">
                        <p>
                          &ldquo;{subject.trim() || "Your email"}&rdquo; will be
                          queued now and go out over the next few minutes. You
                          can follow its progress from the campaign page. Emails
                          already delivered can&apos;t be taken back.
                        </p>
                        <p>
                          <span className="text-foreground font-medium">
                            Audience:
                          </span>{" "}
                          {audienceLabel} (opted in to marketing emails).
                        </p>
                        <PlaceholderNote placeholders={placeholders} />
                      </div>
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

            {hasEmptyProductBlock && (
              <p
                id={productBlockHintId}
                className="text-muted-foreground w-full text-right text-sm"
              >
                Choose products for the product block, or remove it.
              </p>
            )}
          </div>
        </div>

        <ScheduleDialog
          open={scheduleOpen}
          onOpenChange={handleScheduleOpenChange}
          timeZone={timeZone}
          audienceLabel={audienceLabel}
          count={audienceCount}
          placeholders={placeholders}
          pending={saveDraft.isPending || scheduleCampaign.isPending}
          error={scheduleError}
          onConfirm={(at) => void handleSchedule(at)}
        />
      </form>
    </Form>
  );
}
