"use client";

import type { Testimonial } from "generated/prisma";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);
  const [isPublic, setIsPublic] = useState(true);
  const [testimonialDate, setTestimonialDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

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
        testimonial.photoUrls?.length ? [...testimonial.photoUrls] : [""],
      );
      setIsPublic(testimonial.isPublic ?? true);
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
      setPhotoUrls([""]);
      setIsPublic(true);
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
      isPublic,
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">
                  Customer Name <span className="text-red-500">*</span>
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

            {/* Title & Company row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerTitle">Job Title (Optional)</Label>
                <Input
                  id="customerTitle"
                  value={customerTitle}
                  onChange={(e) => setCustomerTitle(e.target.value)}
                  placeholder="CEO"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="customerCompany">Company (Optional)</Label>
                <Input
                  id="customerCompany"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="mt-2"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="testimonialDate">Date</Label>
              <Input
                id="testimonialDate"
                type="date"
                value={testimonialDate}
                onChange={(e) => setTestimonialDate(e.target.value)}
                className="mt-2 max-w-xs"
              />
              <p className="mt-1 text-xs text-gray-500">
                Backdate if importing from another system
              </p>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Testimonial Title (Optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Best service I've ever had!"
                className="mt-2"
              />
            </div>

            {/* Text */}
            <div>
              <Label htmlFor="text">
                Testimonial Text <span className="text-red-500">*</span>
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

            {/* Photo URLs (max 5) */}
            <div>
              <Label>Photo URLs (Optional, max 5)</Label>
              <div className="mt-2 space-y-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...photoUrls];
                        next[i] = e.target.value;
                        setPhotoUrls(next);
                      }}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    {photoUrls.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setPhotoUrls(photoUrls.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {photoUrls.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPhotoUrls([...photoUrls, ""])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add photo URL
                  </Button>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isPublic">Publish Immediately</Label>
                <p className="mt-0.5 text-sm text-gray-500">
                  Owner-added testimonials can be published right away
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
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
