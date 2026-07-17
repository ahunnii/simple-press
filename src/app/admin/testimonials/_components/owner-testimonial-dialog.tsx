"use client";

import type { Testimonial } from "generated/prisma";
import { useEffect } from "react";
import { useUploadFiles } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { OwnerTestimonialFormData } from "~/lib/validators/testimonials";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { getStoredPath } from "~/lib/uploads";
import { ownerTestimonialFormSchema } from "~/lib/validators/testimonials";
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
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  testimonial?: Testimonial;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const maxPhotos = 5;

/** Collapses an optional/blank string field to `undefined` for the mutation payload. */
function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also collapse to undefined, not just null/undefined
  return trimmed ? trimmed : undefined;
}

function buildDefaultValues(
  testimonial?: Testimonial,
): OwnerTestimonialFormData {
  if (testimonial) {
    return {
      customerName: testimonial.customerName ?? "",
      customerEmail: testimonial.customerEmail ?? "",
      customerTitle: testimonial.customerTitle ?? "",
      customerCompany: testimonial.customerCompany ?? "",
      title: testimonial.title ?? "",
      text: testimonial.text ?? "",
      photoUrls: testimonial.photoUrls?.length
        ? [...testimonial.photoUrls]
        : [],
      isApproved: testimonial.isApproved ?? true,
      testimonialDate: format(
        new Date(testimonial.testimonialDate ?? testimonial.createdAt),
        "yyyy-MM-dd",
      ),
    };
  }
  return {
    customerName: "",
    customerEmail: "",
    customerTitle: "",
    customerCompany: "",
    title: "",
    text: "",
    photoUrls: [],
    isApproved: true,
    testimonialDate: format(new Date(), "yyyy-MM-dd"),
  };
}

export function OwnerTestimonialDialog({
  testimonial,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = !!testimonial;

  const form = useForm<OwnerTestimonialFormData>({
    resolver: zodResolver(ownerTestimonialFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(testimonial),
  });

  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "testimonials",
    onUploadComplete: (data) => {
      const newUrls = data.files
        .map((file) => getStoredPath(file))
        .filter(Boolean);
      if (newUrls.length > 0) {
        const current = form.getValues("photoUrls");
        form.setValue(
          "photoUrls",
          [...current, ...newUrls].slice(0, maxPhotos),
          { shouldDirty: true, shouldValidate: true },
        );
      }
    },
    onError: (error) => {
      toast.error(error?.message ?? "Failed to upload image");
    },
  });

  // Populate/reset form whenever the dialog opens or the target testimonial changes.
  useEffect(() => {
    if (!isOpen) return;
    form.reset(buildDefaultValues(testimonial));
  }, [testimonial, isOpen, form]);

  const createMutation = api.testimonial.ownerCreate.useMutation({
    onSuccess: () => {
      toast.success("Testimonial added");
      onSuccess?.();
    },
    onError: (e) =>
      applyTrpcErrorToForm(form, e, {
        fallbackMessage: "Failed to create",
      }),
  });

  const updateMutation = api.testimonial.ownerUpdate.useMutation({
    onSuccess: () => {
      toast.success("Testimonial updated");
      onSuccess?.();
    },
    onError: (e) =>
      applyTrpcErrorToForm(form, e, {
        fallbackMessage: "Failed to update",
      }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: OwnerTestimonialFormData) => {
    const payload = {
      customerName: data.customerName.trim(),
      customerEmail: trimmedOrUndefined(data.customerEmail),
      customerTitle: trimmedOrUndefined(data.customerTitle),
      customerCompany: trimmedOrUndefined(data.customerCompany),
      title: trimmedOrUndefined(data.title),
      text: data.text.trim(),
      photoUrls: data.photoUrls,
      isApproved: data.isApproved,
      testimonialDate: data.testimonialDate,
    };

    if (isEditing) {
      updateMutation.mutate({ id: testimonial.id, ...payload });
    } else {
      createMutation.mutate({ ...payload });
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
                {isEditing ? "Edit Testimonial" : "Add Testimonial"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update this owner-added testimonial"
                  : "Manually add a testimonial from another source"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Attribution row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputFormField
                  form={form}
                  name="customerName"
                  label="Customer Name"
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
                  label="Customer Title (Optional)"
                  placeholder="CEO at Acme"
                />
                <InputFormField
                  form={form}
                  name="customerCompany"
                  label="Customer Company (Optional)"
                  placeholder="Acme Corp"
                />
              </div>

              {/* Testimonial headline & date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputFormField
                  form={form}
                  name="title"
                  label="Headline / Title (Optional)"
                  placeholder="Best product I've ever used!"
                />
                <InputFormField
                  form={form}
                  name="testimonialDate"
                  label="Testimonial Date"
                  type="date"
                  description="Backdate if importing"
                />
              </div>

              {/* Text */}
              <TextareaFormField
                form={form}
                name="text"
                label="Testimonial Text"
                placeholder="Write the testimonial here..."
                rows={5}
                required
              />

              {/* Photos (Optional, max 5) — upload */}
              <FormField
                control={form.control}
                name="photoUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photos (Optional, max 5)</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Upload images to include with this testimonial
                    </p>
                    <div className="space-y-3">
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {field.value.map((url, i) => (
                            <div
                              key={url}
                              className="bg-muted relative h-24 w-24 overflow-hidden rounded-lg border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails from upload URLs */}
                              <img
                                src={url}
                                alt="Testimonial photo"
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                aria-label="Remove photo"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() =>
                                  field.onChange(
                                    field.value.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {field.value.length < maxPhotos && (
                        <div>
                          <input
                            type="file"
                            id="owner-testimonial-photo-upload"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadFiles.isPending}
                            title="Upload photos"
                            aria-label="Upload photos for this testimonial"
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (!files?.length) return;
                              const valid = Array.from(files).filter((f) =>
                                f.type.startsWith("image/"),
                              );
                              const remaining = maxPhotos - field.value.length;
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
                                .getElementById(
                                  "owner-testimonial-photo-upload",
                                )
                                ?.click()
                            }
                            disabled={uploadFiles.isPending}
                          >
                            {uploadFiles.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload photos
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Approval */}
              <FormField
                control={form.control}
                name="isApproved"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="isApproved">Approve Immediately</Label>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        Publish this testimonial right away (owner-added
                        testimonials can be approved on creation)
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
                  "Add Testimonial"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
