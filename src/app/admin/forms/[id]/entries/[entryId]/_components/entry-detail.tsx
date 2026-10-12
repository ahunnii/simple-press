"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type { FormAnswerSnapshot } from "~/lib/forms/answers";
import type { FormSource, FormStatus } from "~/lib/validators/form";
import { formatDate } from "~/lib/format-date";
import {
  answerLabels,
  formatAnswerOrDash,
  isQuantityItems,
} from "~/lib/forms/answers";
import { FORM_STATUS_LABELS, FORM_STATUS_VALUES } from "~/lib/validators/form";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { AdminFormMoreMenu } from "../../../../../_components/admin-form-more-menu";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../../../../_lib/admin-mutation-toast";

export type EntryDetailData = {
  id: string;
  submittedAt: Date;
  status: FormStatus;
  tags: string[];
  source: FormSource;
  answers: FormAnswerSnapshot[];
};

/** Visual for a picture-choice option, from the form's CURRENT definition. */
export type PictureOptionVisual = {
  color?: string | null;
  imageUrl?: string | null;
};

/** fieldId → lowercased option label → visual. */
export type PictureOptionVisuals = Record<
  string,
  Record<string, PictureOptionVisual>
>;

type Props = {
  formId: string;
  entry: EntryDetailData;
  /** Ids of fields still on the form — an answer whose fieldId isn't in here
   *  was captured against a field the owner has since removed. */
  currentFieldIds: Set<string>;
  /** Swatch / photo per picture-choice option, looked up by label. Options
   *  that were deleted or renamed since the entry fell back to a text chip. */
  pictureVisuals?: PictureOptionVisuals;
  /** Mirrors `formSubmission.bulkDelete`'s `ownerOnlyProcedure`. */
  canDelete: boolean;
};

function basePath(formId: string) {
  return `/admin/forms/${formId}/entries`;
}

function PictureChoiceValue({
  answer,
  visuals,
}: {
  answer: FormAnswerSnapshot;
  visuals: Record<string, PictureOptionVisual> | undefined;
}) {
  const labels = answerLabels(answer.value);
  const items = isQuantityItems(answer.value) ? answer.value : null;
  if (labels.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const total = items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return (
    <div className="space-y-1.5">
      <ul className="flex flex-wrap gap-1.5">
        {labels.map((label, index) => {
          const visual = visuals?.[label.trim().toLowerCase()];
          const quantity = items?.[index]?.quantity;
          return (
            <li
              key={`${label}-${index}`}
              className="text-foreground bg-muted inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 text-sm"
            >
              {visual?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded option photo, tiny admin thumbnail
                <img
                  src={visual.imageUrl}
                  alt=""
                  className="size-5 shrink-0 rounded-full border object-cover"
                />
              ) : visual?.color ? (
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded-full border"
                  style={{ backgroundColor: visual.color }}
                />
              ) : (
                <span className="w-1.5" aria-hidden />
              )}
              <span>{label}</span>
              {quantity != null && (
                <span className="text-muted-foreground tabular-nums">
                  × {quantity}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {items && (
        <p className="text-xs font-medium tabular-nums">Total: {total}</p>
      )}
    </div>
  );
}

/** `label:value` → `mailto:`/`tel:` link when the field type warrants it,
 *  plain text otherwise. Long text preserves line breaks. */
function AnswerValue({
  answer,
  pictureVisuals,
}: {
  answer: FormAnswerSnapshot;
  pictureVisuals?: PictureOptionVisuals;
}) {
  const text = formatAnswerOrDash(answer);
  if (answer.value == null) {
    return <span className="text-muted-foreground">{text}</span>;
  }
  if (answer.type === "picturechoice") {
    return (
      <PictureChoiceValue
        answer={answer}
        visuals={pictureVisuals?.[answer.fieldId]}
      />
    );
  }
  if (answer.type === "email" && typeof answer.value === "string") {
    return (
      <a href={`mailto:${answer.value}`} className="hover:underline">
        {text}
      </a>
    );
  }
  if (answer.type === "phone" && typeof answer.value === "string") {
    return (
      <a href={`tel:${answer.value}`} className="hover:underline">
        {text}
      </a>
    );
  }
  if (answer.type === "longtext") {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
  return <span>{text}</span>;
}

export function EntryDetail({
  formId,
  entry,
  currentFieldIds,
  pictureVisuals,
  canDelete,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const { data: tagOptions } = api.formSubmission.listTags.useQuery({ formId });

  // `getById` marked this entry READ server-side as a side effect. Keep the
  // list page's unread badge and the form's own `unreadCount` from going
  // stale if the reader navigates back without a full reload.
  useEffect(() => {
    void utils.formSubmission.invalidate();
    void utils.form.invalidate();
    // Only on mount — re-running on every render would fight the optimistic
    // reads this page itself performs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const afterWrite = () => {
    void utils.formSubmission.invalidate();
    void utils.form.invalidate();
    router.refresh();
  };

  const setStatusMutation = api.formSubmission.setStatus.useMutation({
    onMutate: loadingToast("Updating status…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(`Marked ${FORM_STATUS_LABELS[variables.status]}`);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update status");
    },
  });

  // Tags are edited optimistically against local state and written with the
  // server's atomic add/remove (merged server-side). Sending the whole list
  // from `entry.tags` raced: the prop only updates after `router.refresh()`
  // lands, so a quick second add overwrote the first.
  const [tags, setTags] = useState(entry.tags);
  useEffect(() => {
    setTags(entry.tags);
  }, [entry.tags]);

  const tagMutationOptions = {
    onSuccess: () => {
      afterWrite();
    },
    onError: (error: { message?: string }) => {
      setTags(entry.tags);
      toast.error(error.message ?? "Failed to update tags");
    },
  };
  const addTagsMutation =
    api.formSubmission.bulkAddTags.useMutation(tagMutationOptions);
  const removeTagsMutation =
    api.formSubmission.bulkRemoveTags.useMutation(tagMutationOptions);
  const tagsPending = addTagsMutation.isPending || removeTagsMutation.isPending;
  // The server's add/remove is read-modify-write per row, so overlapping
  // requests could still drop a tag — run tag writes one at a time.
  const tagQueue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueTagWrite = (write: () => Promise<unknown>) => {
    tagQueue.current = tagQueue.current.then(write).catch(() => undefined);
  };

  const deleteMutation = api.formSubmission.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting entry…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      if (data.count > 0) {
        toast.success("Entry deleted");
      } else {
        toast.warning("This entry was already deleted");
      }
      void utils.formSubmission.invalidate();
      void utils.form.invalidate();
      router.push(basePath(formId));
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete entry");
      setDeleteOpen(false);
    },
  });

  const handleStatusChange = (value: string) => {
    setStatusMutation.mutate({ id: entry.id, status: value as FormStatus });
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (
      trimmed === "" ||
      tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())
    ) {
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    enqueueTagWrite(() =>
      addTagsMutation.mutateAsync({ ids: [entry.id], tags: [trimmed] }),
    );
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    enqueueTagWrite(() =>
      removeTagsMutation.mutateAsync({ ids: [entry.id], tags: [tag] }),
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate({ ids: [entry.id] });
  };

  const suggestions = (tagOptions ?? []).filter(
    (tag) => !tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
  );

  return (
    <>
      <div className="admin-form-toolbar">
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href={basePath(formId)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="truncate text-base font-medium">
              Entry — {formatDate(entry.submittedAt)}
            </h1>
          </div>
        </div>

        <div className="toolbar-actions">
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor="entry-status" className="sr-only">
              Status
            </Label>
            <Select
              value={entry.status}
              onValueChange={handleStatusChange}
              disabled={setStatusMutation.isPending}
            >
              <SelectTrigger id="entry-status" className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {FORM_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdminFormMoreMenu
            items={
              canDelete
                ? [
                    {
                      label: "Delete entry",
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => setDeleteOpen(true),
                    },
                  ]
                : []
            }
          />
        </div>
      </div>

      <div className="admin-container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left — answers */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Answers</CardTitle>
              </CardHeader>
              <CardContent>
                {entry.answers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No answers recorded.
                  </p>
                ) : (
                  <dl className="divide-y">
                    {entry.answers.map((answer, index) => (
                      <div
                        key={`${answer.fieldId}-${index}`}
                        className="grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-3 sm:gap-4"
                      >
                        <dt className="text-sm font-medium">{answer.label}</dt>
                        <dd className="text-muted-foreground text-sm sm:col-span-2">
                          <AnswerValue
                            answer={answer}
                            pictureVisuals={pictureVisuals}
                          />
                          {!currentFieldIds.has(answer.fieldId) && (
                            <span className="ml-2 text-xs italic">
                              Field removed from form
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — meta + tags */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">Submitted</p>
                  <p className="font-medium">{formatDate(entry.submittedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Source</p>
                  <p className="font-medium">
                    {entry.source === "IMPORT" ? (
                      <Badge variant="secondary">Imported</Badge>
                    ) : (
                      "Web submission"
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1 pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          disabled={tagsPending}
                          aria-label={`Remove tag ${tag}`}
                          className="hover:bg-accent grid size-4 place-items-center rounded-full"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    maxLength={40}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddTag(tagInput)}
                    disabled={tagInput.trim() === ""}
                  >
                    Add
                  </Button>
                </div>

                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        disabled={tagsPending}
                        className="hover:bg-accent rounded-full border bg-transparent px-2.5 py-1 text-xs font-medium transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this entry&apos;s answers. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
