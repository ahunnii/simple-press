/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadFiles } from "@better-upload/client";
import { Check, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import type { HCaptchaHandle } from "~/components/inputs/hcaptcha-form-field";
import { getStoredPath } from "~/lib/uploads";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";

type TestimonialFormProps = {
  business: {
    id: string;
    name: string;
  };
};

const MAX_PHOTOS = 5;

export function TestimonialForm({ business }: TestimonialFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [approved, setApproved] = useState(false);

  const captchaRef = useRef<HCaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  // Inline error state per field
  const [textError, setTextError] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [photoError, setPhotoError] = useState("");

  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "testimonials",
    onUploadComplete: (data) => {
      const newUrls = data.files
        .map((file) => getStoredPath(file))
        .filter(Boolean);
      if (newUrls.length > 0) {
        setPhotoUrls((prev) => [...prev, ...newUrls].slice(0, MAX_PHOTOS));
        setPhotoError("");
      }
    },
    onError: (error) => {
      toast.error(error?.message ?? "Failed to upload image");
    },
  });

  // Check if user can submit
  const { data: canSubmitData } = api.testimonial.canSubmit.useQuery();

  const submitMutation = api.testimonial.submit.useMutation({
    onSuccess: (data) => {
      toast.success("Thank you for your testimonial!");
      setApproved(data.isApproved);
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit testimonial");
      captchaRef.current?.reset();
      setCaptchaToken("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setTextError("");
    setCaptchaError("");
    setPhotoError("");

    let hasError = false;

    if (!text.trim()) {
      const msg = "Please write your testimonial";
      setTextError(msg);
      toast.error(msg);
      hasError = true;
    } else if (text.length < 10) {
      const msg = "Please write at least 10 characters";
      setTextError(msg);
      toast.error(msg);
      hasError = true;
    }

    if (photoUrls.length > MAX_PHOTOS) {
      const msg = `Maximum ${MAX_PHOTOS} photos allowed`;
      setPhotoError(msg);
      toast.error(msg);
      hasError = true;
    }

    if (!captchaToken) {
      const msg = "Please complete the captcha";
      setCaptchaError(msg);
      toast.error(msg);
      hasError = true;
    }

    if (hasError) return;

    submitMutation.mutate({
      text: text.trim(),
      photoUrls,
      captchaToken,
    });
  };

  // Already submitted
  if (canSubmitData && !canSubmitData.canSubmit) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Check className="h-6 w-6 text-yellow-600" />
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
              {approved
                ? "Your testimonial has been submitted and is now live on the site."
                : "Your testimonial has been submitted and will appear once it's approved."}
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

        <form onSubmit={handleSubmit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Your Testimonial</CardTitle>
              <CardDescription>
                All fields marked with * are required
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Text Testimonial */}
              <div>
                <Label htmlFor="text">
                  Your Testimonial{" "}
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (textError) setTextError("");
                  }}
                  placeholder="Tell us about your experience..."
                  rows={6}
                  maxLength={1000}
                  className="mt-2"
                  required
                  aria-required="true"
                  aria-invalid={textError ? "true" : undefined}
                  aria-describedby={
                    textError ? "text-error text-char-count" : "text-char-count"
                  }
                />
                {textError && (
                  <p
                    id="text-error"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {textError}
                  </p>
                )}
                <p id="text-char-count" className="mt-1 text-sm text-gray-500">
                  {text.length}/1000 characters (minimum 10)
                </p>
              </div>

              {/* Photos (Optional, max 5) — upload */}
              <div>
                <Label htmlFor="testimonial-photo-upload">
                  Photos (Optional, max {MAX_PHOTOS})
                </Label>
                <p id="photo-hint" className="mt-1 text-sm text-gray-500">
                  Upload images to include with your testimonial
                </p>
                <div className="mt-2 space-y-3">
                  {photoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {photoUrls.map((url, i) => (
                        <div
                          key={url}
                          className="relative h-24 w-24 overflow-hidden rounded-lg border bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Preview of testimonial photo ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            aria-label={`Remove photo ${i + 1}`}
                            onClick={() =>
                              setPhotoUrls(photoUrls.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoError && (
                    <p
                      id="photo-error"
                      role="alert"
                      className="text-sm text-red-600"
                    >
                      {photoError}
                    </p>
                  )}
                  {photoUrls.length < MAX_PHOTOS && (
                    <div>
                      <input
                        type="file"
                        id="testimonial-photo-upload"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploadFiles.isPending}
                        aria-describedby="photo-hint"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          const valid = Array.from(files).filter((f) =>
                            f.type.startsWith("image/"),
                          );
                          const remaining = MAX_PHOTOS - photoUrls.length;
                          const toUpload = valid.slice(0, remaining);
                          if (toUpload.length === 0) return;
                          e.target.value = "";
                          await uploadFiles.upload(toUpload);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document
                            .getElementById("testimonial-photo-upload")
                            ?.click()
                        }
                        disabled={uploadFiles.isPending}
                      >
                        {uploadFiles.isPending ? (
                          <>
                            <Loader2
                              className="mr-2 h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Upload photos
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <HCaptchaField
                ref={captchaRef}
                onVerify={(token) => {
                  setCaptchaToken(token);
                  if (captchaError) setCaptchaError("");
                }}
                onExpire={() => setCaptchaToken("")}
                onError={() => setCaptchaToken("")}
                label="Verification"
                required
                fieldId="testimonial-captcha"
                error={captchaError}
                errorId="testimonial-captcha-error"
              />

              {/* Submit */}
              <div className="border-t pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending || !captchaToken}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Submitting...
                    </>
                  ) : (
                    "Submit Testimonial"
                  )}
                </Button>
                <p className="mt-2 text-center text-xs text-gray-500">
                  Your testimonial will be reviewed before it appears on the
                  site
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
