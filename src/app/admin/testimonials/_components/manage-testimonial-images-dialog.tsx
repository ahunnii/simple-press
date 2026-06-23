"use client";

import type { Testimonial } from "generated/prisma";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";
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

type Props = {
  testimonial: Pick<Testimonial, "id" | "photoUrls"> | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ManageTestimonialImagesDialog({
  testimonial,
  open,
  onClose,
  onSuccess,
}: Props) {
  const urls = testimonial?.photoUrls ?? [];
  const [localUrls, setLocalUrls] = useState<string[]>(urls);

  // Sync local state when dialog opens or testimonial changes
  useEffect(() => {
    if (open && testimonial) {
      setLocalUrls([...(testimonial.photoUrls ?? [])]);
    }
  }, [open, testimonial]);

  const updateMutation = api.testimonial.updatePhotoUrls.useMutation({
    onSuccess: () => {
      toast.success("Images updated");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeUrl = (index: number) => {
    setLocalUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!testimonial) return;
    updateMutation.mutate({ id: testimonial.id, photoUrls: localUrls });
  };

  if (!testimonial) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage testimonial images</DialogTitle>
          <DialogDescription>
            Remove images you no longer want to show. Changes apply to the live
            site after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {localUrls.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No images. Remove the last one to hide all images for this
              testimonial.
            </p>
          ) : (
            <ul className="space-y-3">
              {localUrls.map((url, i) => (
                <li
                  key={`${url}-${i}`}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded">
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <span className="text-muted-foreground block w-full flex-1 overflow-hidden text-sm text-ellipsis">
                    Image {i + 1}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeUrl(i)}
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              updateMutation.isPending ||
              JSON.stringify(localUrls) === JSON.stringify(urls)
            }
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
