"use client";

import type { Product, ProductReview } from "generated/prisma";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  businessId: string;
  review?: ProductReview & { product: Product }; // If provided → edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function OwnerReviewDialog({
  businessId,
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

  // Form state
  const [productId, setProductId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTitle, setCustomerTitle] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [verifiedPurchase, setVerifiedPurchase] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [reviewDate, setReviewDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;

    if (review) {
      setCustomerName(review.customerName ?? "");
      setCustomerEmail(review.customerEmail ?? "");
      setCustomerTitle(review.customerTitle ?? "");
      setRating(review.rating ?? 5);
      setTitle(review.title ?? "");
      setComment(review.comment ?? "");
      setVerifiedPurchase(review.verifiedPurchase ?? false);
      setIsApproved(review.isApproved ?? true);
      setReviewDate(
        format(new Date(review.reviewDate ?? review.createdAt), "yyyy-MM-dd"),
      );
    } else {
      setProductId("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerTitle("");
      setRating(5);
      setTitle("");
      setComment("");
      setVerifiedPurchase(false);
      setIsApproved(true);
      setReviewDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [review, isOpen]);

  const createMutation = api.review.ownerCreate.useMutation({
    onSuccess: () => {
      toast.success("Review added");
      onSuccess();
    },
    onError: (e) => toast.error(e.message || "Failed to add review"),
  });

  const updateMutation = api.review.ownerUpdate.useMutation({
    onSuccess: () => {
      toast.success("Review updated");
      onSuccess();
    },
    onError: (e) => toast.error(e.message || "Failed to update review"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !productId) {
      toast.error("Please select a product");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!comment.trim()) {
      toast.error("Review comment is required");
      return;
    }

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerTitle: customerTitle.trim() || undefined,
      rating,
      title: title.trim() || undefined,
      comment: comment.trim(),
      verifiedPurchase,
      isApproved,
      reviewDate,
    };

    if (isEditing) {
      updateMutation.mutate({ id: review.id, ...payload });
    } else {
      createMutation.mutate({ productId, ...payload });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
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
              <div>
                <Label htmlFor="product">
                  Product <span className="text-red-500">*</span>
                </Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Attribution */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">
                  Reviewer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="mt-2"
                />
              </div>
            </div>

            {/* Title & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerTitle">Reviewer Title (Optional)</Label>
                <Input
                  id="customerTitle"
                  value={customerTitle}
                  onChange={(e) => setCustomerTitle(e.target.value)}
                  placeholder="Verified Buyer, Professional Chef…"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="reviewDate">Review Date</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Backdate if importing
                </p>
              </div>
            </div>

            {/* Rating */}
            <div>
              <Label>
                Rating <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    title={`Rate ${star} stars`}
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review title */}
            <div>
              <Label htmlFor="title">Review Headline (Optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Best product I've ever used!"
                className="mt-2"
              />
            </div>

            {/* Comment */}
            <div>
              <Label htmlFor="comment">
                Review Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write the review content here..."
                rows={5}
                className="mt-2"
                required
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="verifiedPurchase">Verified Purchase</Label>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Mark this reviewer as a verified buyer
                  </p>
                </div>
                <Switch
                  id="verifiedPurchase"
                  checked={verifiedPurchase}
                  onCheckedChange={setVerifiedPurchase}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="isApproved">Publish Immediately</Label>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Show this review on the storefront right away
                  </p>
                </div>
                <Switch
                  id="isApproved"
                  checked={isApproved}
                  onCheckedChange={setIsApproved}
                />
              </div>
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
      </DialogContent>
    </Dialog>
  );
}
