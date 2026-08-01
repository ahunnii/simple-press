"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { parseYouTubeVideoId } from "~/lib/youtube/parse";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Paste-a-link dialog for manually adding a single video. Distinguishes the
 * three real failure modes with distinct, human copy rather than one generic
 * toast:
 *
 * 1. Unparseable URL — caught client-side before any network call, since
 *    `videos.create`'s own zod refine would otherwise surface a fairly
 *    generic "Invalid input" through tRPC's error formatter.
 * 2. Private/deleted/age-restricted video — oEmbed returned null server-side;
 *    the router's BAD_REQUEST message is already written for a shop owner,
 *    so it's shown as-is.
 * 3. Duplicate — the router's CONFLICT message ("This video has already been
 *    added.") is also already human; shown as-is.
 *
 * All three render inline under the input (not just a toast) per the "surface
 * clearly" guidance for the sources page's handle-resolution failure — same
 * principle applies here.
 */
export function AddVideoDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = api.videos.create.useMutation({
    onSuccess: () => {
      toast.success("Video added");
      void utils.videos.invalidate();
      router.refresh();
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      setError(
        err.message || "Couldn't add that video — please try again.",
      );
    },
  });

  const reset = () => {
    setUrl("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (createMutation.isPending) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError("Paste a YouTube video link first.");
      return;
    }

    if (!parseYouTubeVideoId(trimmed)) {
      setError(
        "That doesn't look like a YouTube video link. Paste the full URL, e.g. https://www.youtube.com/watch?v=…",
      );
      return;
    }

    setError(null);
    createMutation.mutate({ url: trimmed });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a video</DialogTitle>
            <DialogDescription>
              Paste a link to any YouTube video — we&apos;ll pull in its title
              and thumbnail automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="video-url">YouTube URL</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={createMutation.isPending}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "video-url-error" : undefined}
            />
            {error && (
              <p
                id="video-url-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
