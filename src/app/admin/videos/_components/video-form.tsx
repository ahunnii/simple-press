"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, RotateCcw, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { AdminFormMoreMenuItem } from "~/app/admin/_components/admin-form-more-menu";
import type { RouterOutputs } from "~/trpc/react";
import { youtubeWatchUrl } from "~/lib/youtube/parse";
import { cn } from "~/lib/utils";
import { videoUpdateSchema } from "~/lib/validators/videos";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { AdminFormMoreMenu } from "~/app/admin/_components/admin-form-more-menu";
import { AdminThumb } from "~/app/admin/_components/admin-thumb";

type Props = {
  video: RouterOutputs["videos"]["getById"];
};

/**
 * The wire schema plus one client-only field: the not-yet-uploaded thumbnail.
 *
 * `thumbnailFile` holds a `File` in RHF state and is uploaded in `onSubmit`,
 * NOT when the file is picked — an abandoned form must not leave an orphaned
 * object in S3. `thumbnailOverride` (the persisted URL) stays the field that
 * crosses the wire; `onSubmit` resolves one from the other. Same split as
 * Collections' `imageFile`/`imageUrl`.
 *
 * Extended here rather than in `~/lib/validators/videos` because
 * `videos.update` takes `videoUpdateSchema` as its input and must never see a
 * `File`.
 */
const videoFormSchema = videoUpdateSchema.extend({
  thumbnailFile: z.instanceof(File).optional().nullable(),
});

type FormValues = z.input<typeof videoFormSchema>;

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Edits a video's owner-owned override columns only (`titleOverride`,
 * `descriptionOverride`, `thumbnailOverride`, `published`). The sync-owned
 * columns (`title`, `description`, `thumbnailUrl`, `channelTitle`,
 * `publishedAt`) are rendered read-only in the "From YouTube" card for
 * context — they are rewritten by the cron sync every ~30 minutes and are
 * never accepted by `videos.update` (see `videoUpdateSchema`), so presenting
 * them as editable would be a lie: any "edit" would silently vanish on the
 * next sync.
 */
export function VideoForm({ video }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  // URLs uploaded to S3 during the in-flight submit that aren't yet persisted
  // to the DB. Populated right before `update` is called (that's a
  // fire-and-forget `mutate`, not `mutateAsync`) so the mutation's `onError`
  // can discard them if the save itself fails — otherwise they'd be orphaned
  // in S3 forever (the videos router never deletes from S3).
  const pendingUploadUrlsRef = useRef<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(videoFormSchema),
    mode: "onTouched",
    defaultValues: {
      id: video.id,
      titleOverride: video.titleOverride ?? "",
      descriptionOverride: video.descriptionOverride ?? "",
      thumbnailOverride: video.thumbnailOverride ?? undefined,
      thumbnailFile: undefined,
      published: video.published,
    },
  });

  const thumbnailUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  // Best-effort S3 cleanup for uploads whose parent save step failed. Not
  // user-visible or blocking — the caller's own error path already completed.
  const discardUploadsMutation = api.upload.discardUploads.useMutation({
    onError: (err, variables) => {
      console.warn(
        "Failed to discard uploaded files; objects may be orphaned in S3:",
        variables.urls,
        err,
      );
    },
  });

  const discardPendingUploads = () => {
    const urls = pendingUploadUrlsRef.current;
    pendingUploadUrlsRef.current = [];
    if (urls.length > 0) {
      discardUploadsMutation.mutate({ urls });
    }
  };

  const updateMutation = api.videos.update.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Video updated");
      // The upload from this submit is now persisted (referenced by the
      // updated video) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      void utils.videos.invalidate();
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
      form.reset({
        id: data.id,
        titleOverride: data.titleOverride ?? "",
        descriptionOverride: data.descriptionOverride ?? "",
        thumbnailOverride: data.thumbnailOverride ?? undefined,
        thumbnailFile: undefined,
        published: data.published,
      });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      discardPendingUploads();
      toast.error(err.message ?? "Failed to update video");
    },
    onMutate: () => toast.loading("Saving..."),
  });

  const deleteMutation = api.videos.delete.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Video deleted");
      void utils.videos.invalidate();
      router.push("/admin/videos");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete video");
    },
    onMutate: () => toast.loading("Deleting video..."),
  });

  const onSubmit = async (data: FormValues) => {
    const trimmedTitle = data.titleOverride?.trim() ?? "";
    const trimmedDescription = data.descriptionOverride?.trim() ?? "";

    // Objects uploaded to S3 during THIS submit. Tracked so they can be
    // discarded if the save mutation fails — otherwise a rejected save leaves
    // orphans with nothing referencing them.
    const uploadedThisSubmit: string[] = [];

    // Three states:
    //   File      → upload now, save the resulting URL
    //   null      → the owner removed the override; null falls back to
    //               YouTube's own thumbnail (`resolveVideoThumbnail`)
    //   undefined → untouched, resend whatever `thumbnailOverride` already
    //               holds (see the always-sent note below)
    let thumbnailOverride: string | null;
    const thumbnailFile = data.thumbnailFile;
    if (thumbnailFile === null) {
      thumbnailOverride = null;
    } else if (thumbnailFile instanceof File) {
      try {
        const response = await thumbnailUploader.upload(thumbnailFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        thumbnailOverride = fileLocation || null;
        if (fileLocation) uploadedThisSubmit.push(fileLocation);
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      thumbnailOverride = data.thumbnailOverride ?? null;
    }

    // Hand off to the mutation's onError/onSuccess: `mutate` below is
    // fire-and-forget, so this ref is how the mutation callbacks learn what
    // was uploaded during the submit that's now in flight.
    pendingUploadUrlsRef.current = uploadedThisSubmit;

    updateMutation.mutate({
      id: video.id,
      // "" must collapse to null here — the resolution everywhere else is
      // `titleOverride ?? title`, and `??` only falls through on null or
      // undefined, not on an empty string. Unlike `thumbnailOverride`,
      // `videoUpdateSchema` does NOT do this collapse itself for the text
      // fields, so an un-collapsed "" would "stick" as a literal blank title
      // instead of falling back to YouTube's.
      titleOverride: trimmedTitle ? trimmedTitle : null,
      descriptionOverride: trimmedDescription ? trimmedDescription : null,
      // Always sent explicitly (never omitted) — this is a full-form save,
      // so resending the unchanged current value is a safe no-op. Omitting
      // it is only correct for *partial* updates (see the inline
      // publish/unpublish toggle on the list page), never here.
      thumbnailOverride,
      published: data.published ?? true,
    });
  };

  const isSubmitting = updateMutation.isPending || thumbnailUploader.isPending;
  const isDeleting = deleteMutation.isPending;
  // No local thumbnail state to fold in any more: the pending thumbnail is a
  // real RHF field (`thumbnailFile`), so picking or removing one already marks
  // the form dirty.
  const isDirty = form.formState.isDirty;

  useDirtyForm(isDirty);

  const title = video.titleOverride ?? video.title;

  const handleReset = () => {
    form.reset();
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const moreMenuItems: AdminFormMoreMenuItem[] = [
    {
      label: "View on storefront",
      icon: ExternalLink,
      href: "/videos",
    },
    {
      label: "Reset",
      icon: RotateCcw,
      disabled: isSubmitting || !isDirty,
      onSelect: handleReset,
    },
    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      disabled: isSubmitting,
      onSelect: () => setShowDeleteDialog(true),
    },
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={(e) =>
          void form.handleSubmit(onSubmit, (errors) => {
            const first = Object.values(errors)[0];
            toast.error(
              first?.message ??
                "Please fix the highlighted fields and try again.",
            );
          })(e)
        }
        className="bg-muted/40 min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/videos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="truncate text-base font-medium">{title}</h1>
              <span
                className={cn(
                  "admin-status-badge",
                  isDirty ? "isDirty" : "isPublished",
                )}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor="video-published" className="text-sm">
                    Published
                  </Label>
                  <Switch
                    id="video-published"
                    aria-label="Published"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <AdminFormMoreMenu items={moreMenuItems} />

            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Save changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container space-y-6">
          {/* `items-start`: the two columns hold cards of different heights, and
              grid defaults to `align-items: stretch` — without it the shorter
              column is stretched to the taller one's height, which nothing
              inside consumes. Let each column size to its own content. */}
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            {/* Left column — read-only context synced from YouTube */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>From YouTube</CardTitle>
                  <CardDescription>
                    Synced automatically, roughly every 30 minutes.
                    You can&apos;t edit these directly — use the overrides on
                    the right to change what shoppers see.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-md">
                    {video.thumbnailUrl ? (
                      // AdminThumb, not a plain <img>: YouTube's CDN URL is a
                      // stored, externally-owned URL that can 404 (video made
                      // private, thumbnail re-generated) — fall back to the
                      // placeholder instead of a broken-image icon.
                      <AdminThumb
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{video.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {video.channelTitle ?? "Unknown channel"} ·{" "}
                      {formatDate(video.publishedAt)}
                    </p>
                  </div>
                  {video.description ? (
                    <p className="text-muted-foreground line-clamp-4 text-xs whitespace-pre-line">
                      {video.description}
                    </p>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={youtubeWatchUrl(video.youtubeId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Watch on YouTube
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right column — owner overrides */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your overrides</CardTitle>
                  <CardDescription>
                    Anything you set here replaces YouTube&apos;s version on
                    your site and survives future syncs. Leave a field blank
                    to keep using YouTube&apos;s.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="titleOverride"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>Title</FormLabel>
                          {field.value ? (
                            <button
                              type="button"
                              onClick={() =>
                                form.setValue("titleOverride", "", {
                                  shouldDirty: true,
                                })
                              }
                              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                            >
                              Use YouTube&apos;s title
                            </button>
                          ) : null}
                        </div>
                        <FormControl>
                          <Input
                            placeholder={video.title}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormDescription>
                          YouTube&apos;s title: &quot;{video.title}&quot;
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descriptionOverride"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>Description</FormLabel>
                          {field.value ? (
                            <button
                              type="button"
                              onClick={() =>
                                form.setValue("descriptionOverride", "", {
                                  shouldDirty: true,
                                })
                              }
                              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                            >
                              Use YouTube&apos;s description
                            </button>
                          ) : null}
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder={
                              video.description ??
                              "YouTube didn't provide a description."
                            }
                            rows={4}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Held as a File and uploaded on Save (see onSubmit), so
                      abandoning the form can't orphan an S3 object.
                      `existingPreviewUrl` is watched, not read off the `video`
                      prop, so the preview updates the moment a save lands
                      rather than waiting on router.refresh(). */}
                  <ImageUploadFormField
                    form={form}
                    name="thumbnailFile"
                    label="Thumbnail"
                    description="Leave blank to use the thumbnail shown on the left. Uploading an image here replaces it on your site only — YouTube's own thumbnail is unaffected."
                    existingPreviewUrl={
                      form.watch("thumbnailOverride") ?? undefined
                    }
                    inputRef={thumbnailInputRef}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action
              cannot be undone.
              {video.sourceId
                ? " If it's still in the connected channel or playlist, a future sync could add it back."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(video.id);
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
