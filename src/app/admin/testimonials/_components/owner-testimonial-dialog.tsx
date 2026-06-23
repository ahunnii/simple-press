"use client";

import type { Testimonial } from "generated/prisma";
import { useEffect, useState } from "react";
import { useUploadFiles } from "@better-upload/client";
import { format } from "date-fns";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { getStoredPath } from "~/lib/uploads";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  testimonial?: Testimonial;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function OwnerTestimonialDialog({
  testimonial,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = !!testimonial;

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTitle, setCustomerTitle] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isApproved, setIsApproved] = useState(true);
  const [testimonialDate, setTestimonialDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  const maxPhotos = 5;
  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "testimonials",
    onUploadComplete: (data) => {
      const newUrls = data.files
        .map((file) => getStoredPath(file))
        .filter(Boolean);
      if (newUrls.length > 0) {
        setPhotoUrls((prev) => [...prev, ...newUrls].slice(0, maxPhotos));
      }
    },
    onError: (error) => {
      toast.error(error?.message ?? "Failed to upload image");
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (testimonial) {
      setCustomerName(testimonial.customerName ?? "");
      setCustomerEmail(testimonial.customerEmail ?? "");
      setCustomerTitle(testimonial.customerTitle ?? "");
      setCustomerCompany(testimonial.customerCompany ?? "");
      setTitle(testimonial.title ?? "");
      setText(testimonial.text ?? "");
      setPhotoUrls(
        testimonial.photoUrls?.length ? [...testimonial.photoUrls] : [],
      );
      setIsApproved(testimonial.isApproved ?? true);
      setTestimonialDate(
        format(
          new Date(testimonial.testimonialDate ?? testimonial.createdAt),
          "yyyy-MM-dd",
        ),
      );
    } else {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerTitle("");
      setCustomerCompany("");
      setTitle("");
      setText("");
      setPhotoUrls([]);
      setIsApproved(true);
      setTestimonialDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [testimonial, isOpen]);

  const createMutation = api.testimonial.ownerCreate.useMutation({
    onSuccess: () => {
      toast.success("Testimonial added");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message || "Failed to create"),
  });

  const updateMutation = api.testimonial.ownerUpdate.useMutation({
    onSuccess: () => {
      toast.success("Testimonial updated");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!text.trim()) {
      toast.error("Testimonial text is required");
      return;
    }

    const urls = photoUrls.map((u) => u.trim()).filter(Boolean);
    if (urls.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerTitle: customerTitle.trim() || undefined,
      customerCompany: customerCompany.trim() || undefined,
      title: title.trim() || undefined,
      text: text.trim(),
      photoUrls: urls,
      isApproved,
      testimonialDate,
    };

    if (isEditing) {
      updateMutation.mutate({ id: testimonial.id, ...payload });
    } else {
      createMutation.mutate({ ...payload });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
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
              <div>
                <Label htmlFor="customerName">
                  Customer Name <span className="text-destructive">*</span>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="customerTitle">Customer Title (Optional)</Label>
                <Input
                  id="customerTitle"
                  value={customerTitle}
                  onChange={(e) => setCustomerTitle(e.target.value)}
                  placeholder="CEO at Acme"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="customerCompany">
                  Customer Company (Optional)
                </Label>
                <Input
                  id="customerCompany"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="mt-2"
                />
              </div>
            </div>

            {/* Testimonial headline & date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">Headline / Title (Optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Best product I've ever used!"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="testimonialDate">Testimonial Date</Label>
                <Input
                  id="testimonialDate"
                  type="date"
                  value={testimonialDate}
                  onChange={(e) => setTestimonialDate(e.target.value)}
                  className="mt-2"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Backdate if importing
                </p>
              </div>
            </div>

            {/* Text */}
            <div>
              <Label htmlFor="text">
                Testimonial Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write the testimonial here..."
                rows={5}
                className="mt-2"
                required
              />
            </div>

            {/* Photos (Optional, max 5) — upload */}
            <div>
              <Label>Photos (Optional, max 5)</Label>
              <p className="text-muted-foreground mt-1 text-sm">
                Upload images to include with this testimonial
              </p>
              <div className="mt-2 space-y-3">
                {photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {photoUrls.map((url, i) => (
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
                            setPhotoUrls(photoUrls.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {photoUrls.length < maxPhotos && (
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
                        const remaining = maxPhotos - photoUrls.length;
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
            </div>

            {/* Approval */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isApproved">Approve Immediately</Label>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Publish this testimonial right away (owner-added testimonials
                  can be approved on creation)
                </p>
              </div>
              <Switch
                id="isApproved"
                checked={isApproved}
                onCheckedChange={setIsApproved}
              />
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
                "Add Testimonial"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
