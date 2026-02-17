"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type ProductReviewsProps = {
  productId: string;
  showWriteReview?: boolean;
  onWriteReviewClick?: () => void;
};

export function ProductReviews({
  productId,
  showWriteReview = true,
  onWriteReviewClick,
}: ProductReviewsProps) {
  const [sortBy, setSortBy] = useState<
    "recent" | "helpful" | "rating_high" | "rating_low"
  >("recent");
  const [filterRating, setFilterRating] = useState<number | undefined>(
    undefined,
  );

  const { data: stats } = api.review.getProductStats.useQuery({ productId });
  const { data: reviews } = api.review.listByProduct.useQuery({
    productId,
    sortBy,
    rating: filterRating,
  });

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-6 w-6",
    };

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (!stats || !reviews) {
    return <div>Loading reviews...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Average Rating */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="mb-2 flex justify-center">
                {renderStars(Math.round(stats.averageRating), "lg")}
              </div>
              <p className="text-sm text-gray-600">
                Based on {stats.totalReviews} review
                {stats.totalReviews !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count =
                  stats.ratingDistribution[
                    rating as keyof typeof stats.ratingDistribution
                  ];
                const percentage =
                  stats.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0;

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setFilterRating(
                          rating === filterRating ? undefined : rating,
                        )
                      }
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      <span className="w-8 text-sm font-medium">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </button>
                    <Progress value={percentage} className="flex-1" />
                    <span className="w-12 text-right text-sm text-gray-600">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={sortBy}
            onValueChange={(v) =>
              setSortBy(
                v as "recent" | "helpful" | "rating_high" | "rating_low",
              )
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="helpful">Most Helpful</SelectItem>
              <SelectItem value="rating_high">Highest Rating</SelectItem>
              <SelectItem value="rating_low">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>

          {filterRating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterRating(undefined)}
            >
              Clear Filter
            </Button>
          )}
        </div>

        {showWriteReview && onWriteReviewClick && (
          <Button onClick={onWriteReviewClick}>Write a Review</Button>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <p>No reviews yet. Be the first to review this product!</p>
              {showWriteReview && onWriteReviewClick && (
                <Button className="mt-4" onClick={onWriteReviewClick}>
                  Write a Review
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </div>
    </div>
  );
}

// Individual Review Card
function ReviewCard({
  review,
}: {
  review: RouterOutputs["review"]["listByProduct"][number];
}) {
  const voteMutation = api.review.vote.useMutation({
    onSuccess: () => {
      // Refetch reviews to update counts
    },
  });

  const handleVote = (isHelpful: boolean) => {
    // In production, pass userId if authenticated or ipAddress
    voteMutation.mutate({
      reviewId: review.id,
      isHelpful,
      ipAddress: "placeholder", // Get from request in production
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              {renderStars(review.rating)}
              {review.verifiedPurchase && (
                <Badge variant="secondary" className="text-xs">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Verified Purchase
                </Badge>
              )}
            </div>
            <h3 className="font-medium">{review.title}</h3>
          </div>
        </div>

        {/* Review Content */}
        <p className="mb-4 text-gray-700">{review.comment}</p>

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {review.images.map((image: string, index: number) => (
              <img
                key={index}
                src={image}
                alt={`Review image ${index + 1}`}
                className="h-20 w-20 rounded object-cover"
              />
            ))}
          </div>
        )}

        {/* Video */}
        {review.videoUrl && (
          <div className="mb-4">
            <video
              src={review.videoUrl}
              controls
              className="w-full max-w-md rounded"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{review.customerName}</span>
            {" • "}
            {formatDistanceToNow(new Date(review.createdAt), {
              addSuffix: true,
            })}
          </div>

          {/* Helpful Votes */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Helpful?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVote(true)}
              disabled={voteMutation.isPending}
            >
              <ThumbsUp className="mr-1 h-4 w-4" />
              {review.helpfulCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVote(false)}
              disabled={voteMutation.isPending}
            >
              <ThumbsDown className="mr-1 h-4 w-4" />
              {review.notHelpfulCount}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
