/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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

type ImageEditModalProps = {
  image: {
    id: string;
    url: string;
    altText: string | null;
    caption: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

// Mirrors galleryUpdateImageSchema limits in src/lib/validators/gallery.ts
const ALT_MAX = 200;
const CAPTION_MAX = 300;

export function ImageEditModal({
  image,
  isOpen,
  onClose,
  onSuccess,
}: ImageEditModalProps) {
  const [altText, setAltText] = useState(image.altText ?? "");
  const [caption, setCaption] = useState(image.caption ?? "");

  const updateMutation = api.gallery.updateImage.useMutation({
    onSuccess: () => {
      toast.success("Image updated");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update image");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: image.id,
      altText: altText.trim() || undefined,
      caption: caption.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Update the alt text and caption for this image
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Preview */}
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              <img
                src={image.url}
                alt={altText ?? ""}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </div>

            {/* Alt Text */}
            <div>
              <Label htmlFor="altText">Alt Text</Label>
              <Input
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility"
                className="mt-2"
                maxLength={ALT_MAX}
              />
              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Used by screen readers and when image can&apos;t load
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {altText.length}/{ALT_MAX}
                </span>
              </div>
            </div>

            {/* Caption */}
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption to display with the image"
                rows={3}
                className="mt-2"
                maxLength={CAPTION_MAX}
              />
              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Displayed below or over the image if captions are enabled
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {caption.length}/{CAPTION_MAX}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
