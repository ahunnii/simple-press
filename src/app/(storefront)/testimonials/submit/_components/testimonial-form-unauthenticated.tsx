"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Star } from "lucide-react";
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

type TestimonialFormUnauthenticatedProps = {
  code: string;
  business: {
    id: string;
    name: string;
  };
};

export function TestimonialFormUnauthenticated({
  code,
}: TestimonialFormUnauthenticatedProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Verify invite code
  const { data: invite, isLoading: loadingInvite } =
    api.testimonial.getInvite.useQuery({
      code,
    });

  const submitMutation = api.testimonial.submitWithCode.useMutation({
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

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!text.trim()) {
      toast.error("Please write your testimonial");
      return;
    }

    if (text.length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }

    submitMutation.mutate({
      code,
      name: name.trim(),
      rating,
      text: text.trim(),
      videoUrl: videoUrl.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    });
  };

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="mb-2 text-xl font-semibold">Invalid Invite</h2>
            <p className="text-gray-600">
              This testimonial invite link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              reviewed by {invite.business.name} before being published.
            </p>
            <Button
              onClick={() =>
                router.push(
                  `https://${invite.business.subdomain}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
                )
              }
            >
              Visit {invite.business.name}
            </Button>
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
            {invite.business.name} has invited you to share your feedback
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
              {/* Name */}
              <div>
                <Label htmlFor="name">
                  Your Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-2"
                  required
                />
              </div>

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
                <p className="mt-1 text-sm text-gray-500">Max 1 minute</p>
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
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
