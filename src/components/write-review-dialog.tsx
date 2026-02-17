"use client";

import { useState } from "react";
import { Loader2, Star, Upload } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";

type WriteReviewDialogProps = {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function WriteReviewDialog({
  productId,
  productName,
  isOpen,
  onClose,
  onSuccess,
}: WriteReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  const { data: canReviewData } = api.review.canReview.useQuery(
    { productId },
    { enabled: isOpen },
  );

  const submitMutation = api.review.submit.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const resetForm = () => {
    setRating(5);
    setTitle("");
    setComment("");
    setImages([]);
    setVideoUrl("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a review title");
      return;
    }

    if (comment.length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }

    submitMutation.mutate({
      productId,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      images: images.length > 0 ? images : undefined,
      videoUrl: videoUrl.trim() || undefined,
    });
  };

  const addImage = () => {
    if (images.length >= 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    const url = prompt("Enter image URL:");
    if (url) {
      setImages([...images, url]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  if (!canReviewData?.canReview) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Review</DialogTitle>
            <DialogDescription>
              {canReviewData?.reason ??
                "You cannot review this product at this time."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with {productName}
              {canReviewData?.verifiedPurchase && (
                <span className="mt-1 block text-green-600">
                  ✓ Verified Purchase
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rating */}
            <div>
              <Label>
                Overall Rating <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    title={`Rate ${star} stars`}
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">
                Review Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum up your experience"
                maxLength={200}
                className="mt-2"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {title.length}/200 characters
              </p>
            </div>

            {/* Comment */}
            <div>
              <Label htmlFor="comment">
                Your Review <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you think about this product..."
                rows={6}
                maxLength={2000}
                className="mt-2"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {comment.length}/2000 characters (minimum 10)
              </p>
            </div>

            {/* Images */}
            <div>
              <Label>Photos (Optional)</Label>
              <div className="mt-2">
                {images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="h-20 w-20 rounded object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImage}
                  disabled={images.length >= 5}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Add Photo ({images.length}/5)
                </Button>
              </div>
            </div>

            {/* Video */}
            <div>
              <Label htmlFor="video">Video URL (Optional)</Label>
              <Input
                id="video"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
