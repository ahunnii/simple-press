"use client";

import type { Product, ProductReview } from "generated/prisma";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { OwnerReviewFormData } from "~/lib/validators/reviews";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { ownerReviewFormSchema } from "~/lib/validators/reviews";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  review?: ProductReview & { product: Product }; // If provided → edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

/** Collapses an optional/blank string field to `undefined` for the mutation payload. */
function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also collapse to undefined, not just null/undefined
  return trimmed ? trimmed : undefined;
}

function buildDefaultValues(
  review?: ProductReview & { product: Product },
): OwnerReviewFormData {
  if (review) {
    return {
      productId: review.productId,
      customerName: review.customerName ?? "",
      customerEmail: review.customerEmail ?? "",
      customerTitle: review.customerTitle ?? "",
      rating: review.rating ?? 5,
      title: review.title ?? "",
      comment: review.comment ?? "",
      verifiedPurchase: review.verifiedPurchase ?? false,
      isApproved: review.isApproved ?? true,
      reviewDate: format(
        new Date(review.reviewDate ?? review.createdAt),
        "yyyy-MM-dd",
      ),
    };
  }
  return {
    productId: "",
    customerName: "",
    customerEmail: "",
    customerTitle: "",
    rating: 5,
    title: "",
    comment: "",
    verifiedPurchase: false,
    isApproved: true,
    reviewDate: format(new Date(), "yyyy-MM-dd"),
  };
}

export function OwnerReviewDialog({
  review,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = !!review;

  // Product selector (only needed for create)
  const { data: products } = api.product.secureListAll.useQuery(undefined, {
    enabled: isOpen && !isEditing,
  });

  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<OwnerReviewFormData>({
    resolver: zodResolver(ownerReviewFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(review),
  });

  // Populate/reset form whenever the dialog opens or the target review changes.
  useEffect(() => {
    if (!isOpen) return;
    form.reset(buildDefaultValues(review));
    setHoveredRating(0);
  }, [review, isOpen, form]);

  const createMutation = api.review.ownerCreate.useMutation({
    onSuccess: () => {
      toast.success("Review added");
      onSuccess();
    },
    onError: (e) =>
      applyTrpcErrorToForm(form, e, {
        fallbackMessage: "Failed to add review",
      }),
  });

  const updateMutation = api.review.ownerUpdate.useMutation({
    onSuccess: () => {
      toast.success("Review updated");
      onSuccess();
    },
    onError: (e) =>
      applyTrpcErrorToForm(form, e, {
        fallbackMessage: "Failed to update review",
      }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: OwnerReviewFormData) => {
    const payload = {
      customerName: data.customerName.trim(),
      customerEmail: trimmedOrUndefined(data.customerEmail),
      customerTitle: trimmedOrUndefined(data.customerTitle),
      rating: data.rating,
      title: trimmedOrUndefined(data.title),
      comment: data.comment.trim(),
      verifiedPurchase: data.verifiedPurchase,
      isApproved: data.isApproved,
      reviewDate: data.reviewDate,
    };

    if (isEditing) {
      updateMutation.mutate({ id: review.id, ...payload });
    } else {
      createMutation.mutate({ productId: data.productId, ...payload });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Review" : "Add Review"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? `Editing owner-added review for "${review?.product?.name}"`
                  : "Manually add a review imported from another source"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Product selector — create only */}
              {!isEditing && (
                <SelectFormField
                  form={form}
                  name="productId"
                  label="Product"
                  placeholder="Select a product..."
                  required
                  values={
                    products?.map((p) => ({ value: p.id, label: p.name })) ??
                    []
                  }
                />
              )}

              {/* Attribution */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputFormField
                  form={form}
                  name="customerName"
                  label="Reviewer Name"
                  placeholder="Jane Doe"
                  required
                />
                <InputFormField
                  form={form}
                  name="customerEmail"
                  label="Email (Optional)"
                  type="email"
                  placeholder="jane@example.com"
                />
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputFormField
                  form={form}
                  name="customerTitle"
                  label="Reviewer Title (Optional)"
                  placeholder="Verified Buyer, Professional Chef…"
                />
                <InputFormField
                  form={form}
                  name="reviewDate"
                  label="Review Date"
                  type="date"
                  description="Backdate if importing"
                />
              </div>

              {/* Rating */}
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rating <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          title={`Rate ${star} stars`}
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              star <= (hoveredRating || field.value)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Review title */}
              <InputFormField
                form={form}
                name="title"
                label="Review Headline (Optional)"
                placeholder="Best product I've ever used!"
              />

              {/* Comment */}
              <TextareaFormField
                form={form}
                name="comment"
                label="Review Text"
                placeholder="Write the review content here..."
                rows={5}
                required
              />

              {/* Toggles */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="verifiedPurchase"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label htmlFor="verifiedPurchase">
                          Verified Purchase
                        </Label>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Mark this reviewer as a verified buyer
                        </p>
                      </div>
                      <Switch
                        id="verifiedPurchase"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isApproved"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label htmlFor="isApproved">Publish Immediately</Label>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Show this review on the storefront right away
                        </p>
                      </div>
                      <Switch
                        id="isApproved"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Saving..." : "Adding..."}
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Add Review"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
