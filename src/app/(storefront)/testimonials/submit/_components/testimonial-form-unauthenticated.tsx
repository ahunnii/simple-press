/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useUploadFiles } from "@better-upload/client";
import { Check, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import type { HCaptchaHandle } from "~/components/inputs/hcaptcha-form-field";
import { getBusinessUrl } from "~/lib/business-url";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { HCaptchaField } from "~/components/inputs/hcaptcha-form-field";

type TestimonialFormUnauthenticatedProps = {
  code: string;
  business: {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
    domainStatus: string | null;
  };
};

export function TestimonialFormUnauthenticated({
  code,
  business,
}: TestimonialFormUnauthenticatedProps) {
  const captchaRef = useRef<HCaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [approved, setApproved] = useState(false);

  // Inline error state per field
  const [nameError, setNameError] = useState("");
  const [textError, setTextError] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [photoError, setPhotoError] = useState("");

  const maxPhotos = 5; // cap for upload; invite.maxPhotos enforced on submit
  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "testimonials",
    onUploadComplete: (data) => {
      const newUrls = data.files
        .map((file) => getStoredPath(file))
        .filter(Boolean);
      if (newUrls.length > 0) {
        setPhotoUrls((prev) => [...prev, ...newUrls].slice(0, maxPhotos));
        setPhotoError("");
      }
    },
    onError: (error) => {
      toast.error(error?.message ?? "Failed to upload image");
    },
  });

  // Verify invite code
  const { data: invite, isLoading: loadingInvite } =
    api.testimonial.getInvite.useQuery({
      code,
    });

  const submitMutation = api.testimonial.submitWithCode.useMutation({
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
    setNameError("");
    setTextError("");
    setCaptchaError("");
    setPhotoError("");

    let hasError = false;

    if (!name.trim()) {
      const msg = "Please enter your name";
      setNameError(msg);
      toast.error(msg);
      hasError = true;
    }

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

    const allowedPhotos = invite?.maxPhotos ?? 5;
    if (photoUrls.length > allowedPhotos) {
      const msg = `This invite allows up to ${allowedPhotos} photo(s)`;
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
      code,
      name: name.trim(),
      text: text.trim(),
      photoUrls,
      captchaToken,
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
              {approved
                ? "Your testimonial has been submitted and is now live on the site."
                : "Your testimonial has been submitted and will appear once it's approved."}
            </p>
            <Button
              onClick={() => {
                window.location.href = getBusinessUrl(business);
              }}
            >
              Visit {invite.business.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Share Your Experience</h1>
          <p className="text-gray-600">
            {invite.business.name} has invited you to share your feedback
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
              {/* Name */}
              <div>
                <Label htmlFor="name">
                  Your Name{" "}
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="John Doe"
                  className="mt-2"
                  required
                  aria-required="true"
                  aria-invalid={nameError ? "true" : undefined}
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && (
                  <p
                    id="name-error"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {nameError}
                  </p>
                )}
              </div>

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

              {/* Photos (Optional, up to invite max) — upload */}
              <div>
                <Label htmlFor="testimonial-invite-photo-upload">
                  Photos (Optional, max {invite?.maxPhotos ?? 5})
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
                  {photoUrls.length < (invite?.maxPhotos ?? 5) && (
                    <div>
                      <input
                        type="file"
                        id="testimonial-invite-photo-upload"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploadFiles.isPending}
                        aria-describedby="photo-hint"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files?.length || !invite) return;
                          const valid = Array.from(files).filter((f) =>
                            f.type.startsWith("image/"),
                          );
                          const remaining =
                            (invite.maxPhotos ?? 5) - photoUrls.length;
                          const toUpload = valid.slice(0, remaining);
                          if (toUpload.length === 0) return;
                          e.target.value = "";
                          await uploadFiles.upload(toUpload, {
                            metadata: { code },
                          });
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document
                            .getElementById("testimonial-invite-photo-upload")
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
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
