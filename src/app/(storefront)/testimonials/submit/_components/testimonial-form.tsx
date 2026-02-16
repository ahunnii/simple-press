"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Star, Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

type TestimonialFormProps = {
  business: {
    id: string;
    name: string;
  };
};

export function TestimonialForm({ business }: TestimonialFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check if user can submit
  const { data: canSubmitData } = api.testimonial.canSubmit.useQuery({
    businessId: business.id,
  });

  const submitMutation = api.testimonial.submit.useMutation({
    onSuccess: () => {
      toast.success("Thank you for your testimonial!");
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit testimonial");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      toast.error("Please write your testimonial");
      return;
    }

    if (text.length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }

    submitMutation.mutate({
      businessId: business.id,
      rating,
      text: text.trim(),
      videoUrl: videoUrl.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    });
  };

  // Already submitted
  if (canSubmitData && !canSubmitData.canSubmit) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Already Submitted</h2>
            <p className="text-gray-600">
              {canSubmitData.reason ??
                "You have already submitted a testimonial for this business."}
            </p>
            <Button className="mt-4" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Thank You!</h2>
            <p className="mb-6 text-gray-600">
              Your testimonial has been submitted successfully. It will be
              reviewed by {business.name} before being published.
            </p>
            <Button onClick={() => router.push("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Share Your Experience</h1>
          <p className="text-gray-600">
            Help others by sharing your experience with {business.name}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Your Testimonial</CardTitle>
              <CardDescription>
                All fields marked with * are required
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Rating */}
              <div>
                <Label>
                  Rating <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      title={`Rate ${star} stars`}
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
                <p className="mt-1 text-sm text-gray-500">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              </div>

              {/* Text Testimonial */}
              <div>
                <Label htmlFor="text">
                  Your Testimonial <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={6}
                  maxLength={1000}
                  className="mt-2"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {text.length}/1000 characters (minimum 10)
                </p>
              </div>

              {/* Photo (Optional) */}
              <div>
                <Label htmlFor="photo">Photo (Optional)</Label>
                <Input
                  id="photo"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="mt-2"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Provide a URL to a photo
                </p>
              </div>

              {/* Video (Optional) */}
              <div>
                <Label htmlFor="video">Video (Optional)</Label>
                <Input
                  id="video"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="mt-2"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Provide a URL to a video (max 1 minute)
                </p>
              </div>

              {/* Submit */}
              <div className="border-t pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Testimonial"
                  )}
                </Button>
                <p className="mt-2 text-center text-xs text-gray-500">
                  Your testimonial will be reviewed before being published
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
