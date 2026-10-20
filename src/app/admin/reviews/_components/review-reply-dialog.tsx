"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

// Type-only import: erased before module evaluation, so no runtime cycle with
// `reviews-client.tsx` (which imports this component by value). Same pattern
// as `owner-review-dialog.tsx`.
import type { ReviewRow } from "./reviews-client";
import { cn } from "~/lib/utils";
import { REVIEW_REPLY_MAX_LENGTH } from "~/lib/validators/reviews";
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
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  review: ReviewRow;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Write, edit or remove the owner's single public reply to a review.
 *
 * Mounted by `reviews-client.tsx` only while a row is being replied to, so the
 * textarea seeds from the row's current reply via `useState` and never needs a
 * reset effect. Deliberately NOT a react-hook-form dialog: one free-text field
 * with a counter, and every button is `type="button"` with an explicit handler
 * so nothing here can submit an enclosing form through the portal.
 */
export function ReviewReplyDialog({
  review,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const hasReply = !!review.ownerReply;
  const [text, setText] = useState(review.ownerReply ?? "");
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const setReplyMutation = api.review.setReply.useMutation({
    onSuccess: () => {
      toast.success(hasReply ? "Reply updated" : "Reply posted");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save reply");
    },
  });

  const deleteReplyMutation = api.review.deleteReply.useMutation({
    onSuccess: () => {
      toast.success("Reply removed");
      setConfirmRemoveOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove reply");
    },
  });

  const isPending = setReplyMutation.isPending || deleteReplyMutation.isPending;

  const trimmed = text.trim();
  const overLimit = text.length > REVIEW_REPLY_MAX_LENGTH;
  const unchanged = trimmed === (review.ownerReply ?? "");
  const canSave = trimmed.length > 0 && !unchanged && !overLimit && !isPending;

  const handleSave = () => {
    if (!canSave) return;
    setReplyMutation.mutate({ id: review.id, reply: trimmed });
  };

  const counterId = `review-reply-count-${review.id}`;
  const replyTextId = `review-reply-text-${review.id}`;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) onClose();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {hasReply ? "Edit reply" : "Reply to review"}
            </DialogTitle>
            <DialogDescription>
              Shown publicly under this review on the product page, as a
              response from your business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* The review being answered. */}
            <div className="bg-muted/40 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <div
                  role="img"
                  aria-label={`${review.rating} out of 5 stars`}
                  className="flex gap-0.5"
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      aria-hidden="true"
                      className={
                        s <= review.rating
                          ? "h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30 h-3.5 w-3.5"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {review.customerName}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {review.product.name}
              </p>
              <p className="text-muted-foreground mt-2 line-clamp-4 text-sm whitespace-pre-line">
                {review.comment}
              </p>
            </div>

            {review.status !== "published" && (
              <p className="text-muted-foreground text-sm">
                This review isn&apos;t public yet — your reply will show once
                it&apos;s approved and visible.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor={replyTextId}>Your reply</Label>
              <Textarea
                id={replyTextId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Thank the customer, answer a question, or address a concern…"
                disabled={isPending}
                aria-invalid={overLimit || undefined}
                aria-describedby={counterId}
              />
              <div className="flex items-start justify-between gap-3">
                <p className="text-muted-foreground text-xs">
                  {hasReply && review.ownerReplyAt
                    ? `Replied by ${review.ownerReplyBy?.name ?? "your team"} · ${format(
                        new Date(review.ownerReplyAt),
                        "MMM d, yyyy",
                      )}`
                    : ""}
                </p>
                <p
                  id={counterId}
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    overLimit
                      ? "text-destructive font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {text.length} / {REVIEW_REPLY_MAX_LENGTH}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            {hasReply ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmRemoveOpen(true)}
                disabled={isPending}
              >
                Remove reply
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={!canSave}>
                {setReplyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : hasReply ? (
                  "Save reply"
                ) : (
                  "Post reply"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmRemoveOpen}
        onOpenChange={(open) => {
          if (!deleteReplyMutation.isPending) setConfirmRemoveOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove reply?</AlertDialogTitle>
            <AlertDialogDescription>
              Your reply to {review.customerName} will no longer appear under
              their review. The review itself isn&apos;t changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReplyMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, not className — see reviews-client's delete dialog. */}
            <AlertDialogAction
              variant="destructive"
              disabled={deleteReplyMutation.isPending}
              onClick={(e) => {
                // Keep Radix from auto-closing; we close on success.
                e.preventDefault();
                deleteReplyMutation.mutate({ id: review.id });
              }}
            >
              {deleteReplyMutation.isPending ? "Removing…" : "Remove reply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
