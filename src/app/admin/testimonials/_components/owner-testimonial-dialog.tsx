"use client";

import type { Testimonial } from "generated/prisma";
import { useEffect, useState } from "react";
import { useUploadFiles } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronDown, Loader2, Trash2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { OwnerTestimonialFormData } from "~/lib/validators/testimonials";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { getStoredPath } from "~/lib/uploads";
import { cn } from "~/lib/utils";
import { ownerTestimonialFormSchema } from "~/lib/validators/testimonials";
import { api } from "~/trpc/react";
import { EntityFormDialog } from "~/components/admin/entity-form-dialog";
import { Button } from "~/components/ui/button";
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
import { SwitchFormField } from "~/components/inputs/switch-form-field";
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

/**
 * The optional attribution fields demoted into the "Additional details"
 * disclosure. One list, because both things that force the section open — a
 * record that already has data, and a validation error on a field inside it —
 * must cover exactly the same fields the section renders.
 */
const ADDITIONAL_DETAIL_FIELDS = [
  "customerEmail",
  "customerTitle",
  "customerCompany",
  "title",
] as const satisfies readonly (keyof OwnerTestimonialFormData)[];

/**
 * Whether the disclosure holds any data for this record.
 *
 * Its fields are optional attribution, so it is collapsed by default — but an
 * existing testimonial that already has any of them must open with the section
 * expanded, or editing would silently hide saved data from the person editing
 * it. Derived from the built defaults (not the raw row) so this can't drift
 * from what the form is actually seeded with.
 */
function hasAdditionalDetails(values: OwnerTestimonialFormData): boolean {
  return ADDITIONAL_DETAIL_FIELDS.some(
    (key) => (values[key]?.trim().length ?? 0) > 0,
  );
}

export function OwnerTestimonialDialog({
  testimonial,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = !!testimonial;

  const [detailsOpen, setDetailsOpen] = useState(false);

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
    const defaults = buildDefaultValues(testimonial);
    form.reset(defaults);
    setDetailsOpen(hasAdditionalDetails(defaults));
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

  // A collapsed section must never swallow an error message — from zod on
  // submit or from `applyTrpcErrorToForm` mapping a server field error.
  const { errors } = form.formState;
  const detailsHasError = ADDITIONAL_DETAIL_FIELDS.some((key) =>
    Boolean(errors[key]),
  );
  const detailsExpanded = detailsOpen || detailsHasError;

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
    <EntityFormDialog
      form={form}
      isOpen={isOpen}
      onClose={onClose}
      isEditing={isEditing}
      title={isEditing ? "Edit Testimonial" : "Add Testimonial"}
      description={
        isEditing
          ? "Update this owner-added testimonial"
          : "Manually add a testimonial from another source"
      }
      submitLabel="Add Testimonial"
      isPending={isPending}
      onSubmit={onSubmit}
    >
      {/* Who + when */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <InputFormField
          form={form}
          name="customerName"
          label="Customer Name"
          placeholder="Jane Doe"
          className="col-span-1"
          required
        />
        <InputFormField
          form={form}
          name="testimonialDate"
          label="Testimonial Date"
          type="date"
          description="Backdate if importing"
          className="col-span-1"
        />
      </div>

      {/* The testimonial itself — the reason the dialog is open. */}
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
                          field.onChange(field.value.filter((_, j) => j !== i))
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
                        .getElementById("owner-testimonial-photo-upload")
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
              label="Customer Title (Optional)"
              placeholder="CEO at Acme"
              className="col-span-1"
            />
            <InputFormField
              form={form}
              name="customerCompany"
              label="Customer Company (Optional)"
              placeholder="Acme Corp"
              className="col-span-1"
            />
            <InputFormField
              form={form}
              name="title"
              label="Headline / Title (Optional)"
              placeholder="Best product I've ever used!"
              className="col-span-1"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Approval */}
      <SwitchFormField
        form={form}
        name="isApproved"
        label="Approve Immediately"
        description="Publish this testimonial right away (owner-added testimonials can be approved on creation)"
      />
    </EntityFormDialog>
  );
}
