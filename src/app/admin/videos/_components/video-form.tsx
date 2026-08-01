"use client";

import type { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { TemplateImageUploadField } from "~/app/admin/content/template/_components/template-field-widgets";

type Props = {
  video: RouterOutputs["videos"]["getById"];
};

type FormValues = z.input<typeof videoUpdateSchema>;

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
  const [thumbnailOverride, setThumbnailOverride] = useState<string>(
    video.thumbnailOverride ?? "",
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(videoUpdateSchema),
    mode: "onTouched",
    defaultValues: {
      id: video.id,
      titleOverride: video.titleOverride ?? "",
      descriptionOverride: video.descriptionOverride ?? "",
      thumbnailOverride: video.thumbnailOverride ?? undefined,
      published: video.published,
    },
  });

  const updateMutation = api.videos.update.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Video updated");
      void utils.videos.invalidate();
      setThumbnailOverride(data.thumbnailOverride ?? "");
      form.reset({
        id: data.id,
        titleOverride: data.titleOverride ?? "",
        descriptionOverride: data.descriptionOverride ?? "",
        thumbnailOverride: data.thumbnailOverride ?? undefined,
        published: data.published,
      });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
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

  const onSubmit = (data: FormValues) => {
    const trimmedTitle = data.titleOverride?.trim() ?? "";
    const trimmedDescription = data.descriptionOverride?.trim() ?? "";

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

  const isSubmitting = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDirty =
    form.formState.isDirty ||
    thumbnailOverride !== (video.thumbnailOverride ?? "");

  useDirtyForm(isDirty);

  const title = video.titleOverride ?? video.title;

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
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <a
                href="/videos"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View videos on storefront"
                title="View videos on storefront"
              >
                <ExternalLink className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">View on storefront</span>
              </a>
            </Button>

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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setShowDeleteDialog(true)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={() => {
                form.reset();
                setThumbnailOverride(video.thumbnailOverride ?? "");
              }}
              className="hidden md:inline-flex"
            >
              Reset
            </Button>

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
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

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Thumbnail</Label>
                    <TemplateImageUploadField
                      value={thumbnailOverride}
                      onChange={setThumbnailOverride}
                      description="Leave blank to use the thumbnail shown on the left. Uploading or choosing an image here replaces it on your site only — YouTube's own thumbnail is unaffected."
                    />
                  </div>
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
