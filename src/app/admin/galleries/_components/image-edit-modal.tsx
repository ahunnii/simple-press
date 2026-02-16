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
            <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
              <img
                src={image.url}
                alt={altText ?? ""}
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
              />
              <p className="mt-1 text-xs text-gray-500">
                Used by screen readers and when image can&apos;t load
              </p>
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
              />
              <p className="mt-1 text-xs text-gray-500">
                Displayed below or over the image if captions are enabled
              </p>
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
