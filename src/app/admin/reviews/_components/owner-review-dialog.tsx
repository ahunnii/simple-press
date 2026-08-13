"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronDown, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { OwnerReviewFormData } from "~/lib/validators/reviews";
// Type-only import from the client that renders this dialog — safe despite
// `reviews-client.tsx` importing this component by value: `import type` is
// erased before module evaluation, so there is no runtime cycle, only a
// type-level dependency. Reusing `ReviewRow` (the trimmed `review.listAll`
// row + derived `status`) keeps this dialog's prop in sync with the one row
// shape the whole Reviews table already uses, instead of a second
// hand-copied structural type that could drift from it.
import type { ReviewRow } from "./reviews-client";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn } from "~/lib/utils";
import { ownerReviewFormSchema } from "~/lib/validators/reviews";
import { api } from "~/trpc/react";
import { EntityFormDialog } from "~/components/admin/entity-form-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  review?: ReviewRow; // If provided → edit mode
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

function buildDefaultValues(review?: ReviewRow): OwnerReviewFormData {
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

/**
 * The optional attribution fields demoted into the "Additional details"
 * disclosure. One list, because both things that force the section open — a
 * record that already has data, and a validation error on a field inside it —
 * must cover exactly the same fields the section renders.
 */
const ADDITIONAL_DETAIL_FIELDS = [
  "customerEmail",
  "customerTitle",
  "title",
] as const satisfies readonly (keyof OwnerReviewFormData)[];

/**
 * Whether the disclosure holds any data for this record.
 *
 * Its fields are optional attribution, so it is collapsed by default — but an
 * existing review that already has any of them must open with the section
 * expanded, or editing would silently hide saved data from the person editing
 * it. Derived from the built defaults (not the raw row) so this can't drift
 * from what the form is actually seeded with.
 */
function hasAdditionalDetails(values: OwnerReviewFormData): boolean {
  return ADDITIONAL_DETAIL_FIELDS.some(
    (key) => (values[key]?.trim().length ?? 0) > 0,
  );
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const form = useForm<OwnerReviewFormData>({
    resolver: zodResolver(ownerReviewFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(review),
  });

  // Populate/reset form whenever the dialog opens or the target review changes.
  useEffect(() => {
    if (!isOpen) return;
    const defaults = buildDefaultValues(review);
    form.reset(defaults);
    setHoveredRating(0);
    setDetailsOpen(hasAdditionalDetails(defaults));
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

  // A collapsed section must never swallow an error message — from zod on
  // submit or from `applyTrpcErrorToForm` mapping a server field error.
  const { errors } = form.formState;
  const detailsHasError = ADDITIONAL_DETAIL_FIELDS.some((key) =>
    Boolean(errors[key]),
  );
  const detailsExpanded = detailsOpen || detailsHasError;

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
    <EntityFormDialog
      form={form}
      isOpen={isOpen}
      onClose={onClose}
      isEditing={isEditing}
      title={isEditing ? "Edit Review" : "Add Review"}
      description={
        isEditing
          ? `Editing owner-added review for "${review?.product?.name}"`
          : "Manually add a review imported from another source"
      }
      submitLabel="Add Review"
      isPending={isPending}
      onSubmit={onSubmit}
    >
      {/* Who + when */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <InputFormField
          form={form}
          name="customerName"
          label="Reviewer Name"
          placeholder="Jane Doe"
          className="col-span-1"
          required
        />
        <InputFormField
          form={form}
          name="reviewDate"
          label="Review Date"
          type="date"
          description="Backdate if importing"
          className="col-span-1"
        />
      </div>

      {/* Product selector — create only */}
      {!isEditing && (
        <SelectFormField
          form={form}
          name="productId"
          label="Product"
          placeholder="Select a product..."
          required
          values={products?.map((p) => ({ value: p.id, label: p.name })) ?? []}
        />
      )}

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

      {/* The review itself — the reason the dialog is open. */}
      <TextareaFormField
        form={form}
        name="comment"
        label="Review Text"
        placeholder="Write the review content here..."
        rows={5}
        required
      />

      {/* Optional attribution — collapsed unless this record already has some.
          Every field below is still submitted exactly as before; this is a
          visual demotion only. */}
      <Collapsible
        open={detailsExpanded}
        onOpenChange={setDetailsOpen}
        className="border-border rounded-lg border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="focus-visible:ring-ring flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium focus-visible:ring-1 focus-visible:outline-none"
          >
            <span>Additional details</span>
            <ChevronDown
              className={cn(
                "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                detailsExpanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-border border-t p-3">
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <InputFormField
              form={form}
              name="customerEmail"
              label="Email (Optional)"
              type="email"
              placeholder="jane@example.com"
              className="col-span-1"
            />
            <InputFormField
              form={form}
              name="customerTitle"
              label="Reviewer Title (Optional)"
              placeholder="Verified Buyer, Professional Chef…"
              className="col-span-1"
            />
            <InputFormField
              form={form}
              name="title"
              label="Review Headline (Optional)"
              placeholder="Best product I've ever used!"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Toggles */}
      <div className="space-y-3">
        <SwitchFormField
          form={form}
          name="verifiedPurchase"
          label="Verified Purchase"
          description="Mark this reviewer as a verified buyer"
        />

        <SwitchFormField
          form={form}
          name="isApproved"
          label="Publish Immediately"
          description="Show this review on the storefront right away"
        />
      </div>
    </EntityFormDialog>
  );
}
