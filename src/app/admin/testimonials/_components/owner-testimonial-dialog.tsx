"use client";

import type { Testimonial } from "generated/prisma";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Star } from "lucide-react";
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
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type OwnerTestimonialDialogProps = {
  businessId: string;
  testimonial?: Testimonial; // If provided, we're editing
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function OwnerTestimonialDialog({
  businessId,
  testimonial,
  isOpen,
  onClose,
  onSuccess,
}: OwnerTestimonialDialogProps) {
  const isEditing = !!testimonial;

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTitle, setCustomerTitle] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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
      setRating(testimonial.rating ?? 5);
      setTitle(testimonial.title ?? "");
      setText(testimonial.text ?? "");
      setPhotoUrl(testimonial.photoUrl ?? "");
      setVideoUrl(testimonial.videoUrl ?? "");
      setIsPublic(testimonial.isPublic ?? true);
      setTestimonialDate(
        format(
          new Date(testimonial.testimonialDate ?? testimonial.createdAt),
          "yyyy-MM-dd",
        ),
      );
    } else {
      // Reset for create
      setCustomerName("");
      setCustomerEmail("");
      setCustomerTitle("");
      setCustomerCompany("");
      setRating(5);
      setTitle("");
      setText("");
      setPhotoUrl("");
      setVideoUrl("");
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

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerTitle: customerTitle.trim() || undefined,
      customerCompany: customerCompany.trim() || undefined,
      rating,
      title: title.trim() || undefined,
      text: text.trim(),
      photoUrl: photoUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      isPublic,
      testimonialDate,
    };

    if (isEditing) {
      updateMutation.mutate({ id: testimonial.id, ...payload });
    } else {
      createMutation.mutate({ businessId, ...payload });
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

            {/* Rating & Date row */}
            <div className="grid grid-cols-2 items-start gap-4">
              <div>
                <Label>
                  Rating <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      title={`Rate ${star} stars`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="testimonialDate">Date</Label>
                <Input
                  id="testimonialDate"
                  type="date"
                  value={testimonialDate}
                  onChange={(e) => setTestimonialDate(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Backdate if importing from another system
                </p>
              </div>
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

            {/* Photo & Video URLs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="photoUrl">Photo URL (Optional)</Label>
                <Input
                  id="photoUrl"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="videoUrl">Video URL (Optional)</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2"
                />
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
