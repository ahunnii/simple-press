"use client";

import type { Product, ProductReview } from "generated/prisma";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Check,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

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
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { OwnerReviewDialog } from "./owner-review-dialog";

export function ReviewsAdminList({ businessId }: { businessId: string }) {
  const [source, setSource] = useState<"customer" | "owner" | "all">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<
    (ProductReview & { product: Product }) | null
  >(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: reviews, refetch } = api.review.listAll.useQuery({
    businessId,
    status: "all",
    source,
  });

  const approveMutation = api.review.approve.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const hideMutation = api.review.toggleHidden.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = api.review.delete.useMutation({
    onSuccess: () => {
      toast.success("Review deleted");
      setDeleteId(null);
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const all = reviews ?? [];
  const pending = all.filter((r) => !r.isApproved && !r.isHidden);
  const approved = all.filter((r) => r.isApproved && !r.isHidden);
  const hidden = all.filter((r) => r.isHidden);
  const ownerAdded = all.filter((r) => r.source === "owner");
  const customerSub = all.filter((r) => r.source === "customer");

  const Stars = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );

  const ReviewCard = ({
    review,
  }: {
    review: ProductReview & { product: Product };
  }) => (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {/* Top row: stars + badges */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Stars rating={review.rating} />

              {review.source === "owner" ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserCog className="h-3 w-3" />
                  Owner Added
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserCheck className="h-3 w-3" />
                  Customer
                </Badge>
              )}

              {review.verifiedPurchase && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Purchase
                </Badge>
              )}

              {review.isApproved && !review.isHidden && (
                <Badge className="bg-green-600 text-xs">Published</Badge>
              )}
              {!review.isApproved && !review.isHidden && (
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              )}
              {review.isHidden && (
                <Badge variant="destructive" className="text-xs">
                  Hidden
                </Badge>
              )}
            </div>

            {/* Product link */}
            <p className="mb-1 text-xs text-gray-400">
              On:{" "}
              <span className="font-medium text-gray-600">
                {review.product.name}
              </span>
            </p>

            {/* Title */}
            {review.title && (
              <p className="mb-1 text-sm font-semibold">{review.title}</p>
            )}

            {/* Comment */}
            <p className="mb-3 line-clamp-3 text-sm text-gray-700">
              {review.comment}
            </p>

            {/* Images */}
            {review.images?.length > 0 && (
              <div className="mb-3 flex gap-1.5">
                {review.images.map((img: string, i: number) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                ))}
              </div>
            )}

            {/* Attribution */}
            <div className="text-sm">
              <span className="font-medium">{review.customerName}</span>
              {review.customerEmail && (
                <span className="ml-2 text-xs text-gray-400">
                  ({review.customerEmail})
                </span>
              )}
              {review.customerTitle && (
                <span className="ml-1 text-xs text-gray-500">
                  · {review.customerTitle}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              {review.source === "owner"
                ? format(new Date(review.reviewDate), "MMM d, yyyy")
                : formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                  })}
            </p>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {review.source === "owner" && (
                <>
                  <DropdownMenuItem onClick={() => setEditingReview(review)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {!review.isApproved && !review.isHidden && (
                <DropdownMenuItem
                  onClick={() =>
                    approveMutation.mutate({ id: review.id, isApproved: true })
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
              )}
              {review.isApproved && !review.isHidden && (
                <DropdownMenuItem
                  onClick={() =>
                    approveMutation.mutate({ id: review.id, isApproved: false })
                  }
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Unapprove
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() =>
                  hideMutation.mutate({
                    id: review.id,
                    isHidden: !review.isHidden,
                  })
                }
              >
                {review.isHidden ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Unhide
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteId(review.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const Empty = ({ msg }: { msg: string }) => (
    <Card>
      <CardContent className="py-12 text-center text-sm text-gray-500">
        {msg}
      </CardContent>
    </Card>
  );

  return (
    <div className="admin-container space-y-6">
      <div className="admin-header">
        <div>
          <h1>Product Reviews</h1>
          <p>Manage your product reviews</p>
          <div className="mt-4 flex items-center gap-3">
            <h2 className="text-sm font-medium text-gray-600">
              Filter by source:
            </h2>
            <Select
              value={source}
              onValueChange={(v) =>
                setSource(v as "customer" | "owner" | "all")
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({all.length})</SelectItem>
                <SelectItem value="customer">
                  Customer ({customerSub.length})
                </SelectItem>
                <SelectItem value="owner">
                  Owner Added ({ownerAdded.length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Review
          </Button>
        </div>
      </div>

      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-600">
            Filter by source:
          </h2>
          <Select
            value={source}
            onValueChange={(v) => setSource(v as "customer" | "owner" | "all")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({all.length})</SelectItem>
              <SelectItem value="customer">
                Customer ({customerSub.length})
              </SelectItem>
              <SelectItem value="owner">
                Owner Added ({ownerAdded.length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Review
        </Button>
      </div> */}

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Published ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="hidden">Hidden ({hidden.length})</TabsTrigger>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <Empty msg="No pending reviews — you're all caught up!" />
          ) : (
            pending.map((r) => (
              <ReviewCard
                key={r.id}
                review={r as ProductReview & { product: Product }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? (
            <Empty msg="No published reviews yet" />
          ) : (
            approved.map((r) => (
              <ReviewCard
                key={r.id}
                review={r as ProductReview & { product: Product }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="hidden" className="mt-4 space-y-3">
          {hidden.length === 0 ? (
            <Empty msg="No hidden reviews" />
          ) : (
            hidden.map((r) => (
              <ReviewCard
                key={r.id}
                review={r as ProductReview & { product: Product }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {all.length === 0 ? (
            <Empty msg="No reviews yet" />
          ) : (
            all.map((r) => (
              <ReviewCard
                key={r.id}
                review={r as ProductReview & { product: Product }}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <OwnerReviewDialog
        businessId={businessId}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          void refetch();
        }}
      />

      {/* Edit dialog */}
      {editingReview && (
        <OwnerReviewDialog
          businessId={businessId}
          review={editingReview}
          isOpen={true}
          onClose={() => setEditingReview(null)}
          onSuccess={() => {
            setEditingReview(null);
            void refetch();
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the review and updates the product&apos;s
              rating. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
