"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ExternalLink,
  ImageIcon,
  RotateCcw,
  Save,
  Trash2,
  Video,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { AdminFormMoreMenuItem } from "~/app/admin/_components/admin-form-more-menu";
import type { RouterOutputs } from "~/trpc/react";
import { COMMON_TIME_ZONES } from "~/lib/time-zones";
import { cn } from "~/lib/utils";
import { eventFormSchema } from "~/lib/validators/events";
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
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { VideoUploadFormField } from "~/components/inputs/video-upload-form-field";
import { AdminFormMoreMenu } from "~/app/admin/_components/admin-form-more-menu";

import { toWallClockInput } from "./event-wall-clock";

type Props = {
  /** Pass an event when in edit mode; omit for create mode. */
  event?: RouterOutputs["events"]["getById"];
  /** Business.timeZone (IANA) — wall-clock strings are interpreted in this
   *  zone both here and server-side (see resolveTimeZone in
   *  src/server/api/routers/events.ts). */
  timeZone: string;
};

/**
 * The wire schema plus two client-only fields: the not-yet-uploaded cover
 * image and the not-yet-uploaded cover video.
 *
 * `coverImageFile` / `coverVideoFile` hold a `File` in RHF state and are
 * uploaded in `onSubmit`, NOT when the file is picked — an abandoned form must
 * not leave an orphaned object in S3. `coverImage` / `coverVideo` (the
 * persisted URLs) stay the fields that cross the wire; `onSubmit` resolves one
 * from the other. Same split as Collections' `imageFile`/`imageUrl`.
 *
 * Declared here rather than in `~/lib/validators/events` because `events.create`
 * / `events.update` must never see it, and `eventFormSchema` is a `ZodEffects`
 * (it carries the endAt≥startAt `.refine`), which cannot be `.extend()`ed —
 * hence `z.intersection` rather than an extend.
 */
const eventFormWithImageSchema = z.intersection(
  eventFormSchema,
  z.object({
    coverImageFile: z.instanceof(File).optional().nullable(),
    coverVideoFile: z.instanceof(File).optional().nullable(),
  }),
);

type FormValues = z.input<typeof eventFormWithImageSchema>;

/** Which of the event's single media slot the form is currently editing. */
type MediaKind = "photo" | "video";

function timeZoneLabel(timeZone: string): string {
  return COMMON_TIME_ZONES.find((z) => z.value === timeZone)?.label ?? timeZone;
}

export function EventForm({ event, timeZone }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const coverVideoInputRef = useRef<HTMLInputElement | null>(null);
  // Which media slot the Basic Information card is showing. Deliberately plain
  // local state and NOT an RHF field: flipping the tab is a view change, and a
  // bare tab switch must not mark the form dirty or reach the wire. `onSubmit`
  // reads it to decide which slot to resolve; every place that resets the form
  // re-derives it from the freshly known `coverVideo`.
  const [mediaKind, setMediaKind] = useState<MediaKind>(
    event?.coverVideo ? "video" : "photo",
  );
  // URLs uploaded to S3 during the in-flight submit that aren't yet persisted
  // to the DB. Populated right before `create`/`update` is called (those are
  // fire-and-forget `mutate`, not `mutateAsync`) so the mutation's `onError`
  // can discard them if the save itself fails — otherwise they'd be orphaned
  // in S3 forever (the events router never deletes from S3).
  const pendingUploadUrlsRef = useRef<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(eventFormWithImageSchema),
    mode: "onTouched",
    defaultValues: {
      name: event?.name ?? "",
      blurb: event?.blurb ?? "",
      coverImage: event?.coverImage ?? undefined,
      coverImageFile: undefined,
      coverVideo: event?.coverVideo ?? undefined,
      coverVideoFile: undefined,
      startAt: event
        ? toWallClockInput(event.startAt, event.allDay, timeZone)
        : "",
      endAt:
        event?.endAt != null
          ? toWallClockInput(event.endAt, event.allDay, timeZone)
          : undefined,
      allDay: event?.allDay ?? false,
      location: event?.location ?? "",
      externalUrl: event?.externalUrl ?? "",
      externalUrlLabel: event?.externalUrlLabel ?? "",
      priceLabel: event?.priceLabel ?? "",
      // New events start published, matching the rest of the admin (products,
      // collections, services) — an owner adding a date almost always intends
      // it to go live, and the toolbar Switch is right there to opt out.
      published: event?.published ?? true,
    },
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  // Separate route from `image` — the video route caps at 50MB and accepts
  // `video/*` (see src/app/api/upload/route.ts). Its keys are `video-`
  // prefixed, which `upload.discardUploads` already recognises, so failed
  // saves clean up the same way image uploads do.
  const videoUploader = useUploadFile({
    api: "/api/upload",
    route: "video",
    onError: (error) => {
      toast.error(error.message ?? "Video upload failed.");
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

  const createMutation = api.events.create.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Event created successfully");
      // Uploads from this submit are now persisted (referenced by the new
      // event) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      void utils.events.invalidate();
      router.push(`/admin/events/${data.id}`);
    },
    onError: (err) => {
      toast.dismiss();
      discardPendingUploads();
      toast.error(err.message ?? "Failed to create event");
    },
    onMutate: () => toast.loading("Creating event..."),
  });

  const updateMutation = api.events.update.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Event updated successfully");
      // Uploads from this submit are now persisted (referenced by the updated
      // event) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      void utils.events.invalidate();
      if (coverImageInputRef.current) coverImageInputRef.current.value = "";
      if (coverVideoInputRef.current) coverVideoInputRef.current.value = "";
      // The save may have flipped which slot holds media (they're mutually
      // exclusive — see onSubmit), so re-derive the visible tab from what came
      // back rather than leaving it on whatever the owner last clicked.
      setMediaKind(data.coverVideo ? "video" : "photo");
      form.reset({
        name: data.name,
        blurb: data.blurb ?? "",
        coverImage: data.coverImage ?? undefined,
        coverImageFile: undefined,
        coverVideo: data.coverVideo ?? undefined,
        coverVideoFile: undefined,
        startAt: toWallClockInput(data.startAt, data.allDay, timeZone),
        endAt:
          data.endAt != null
            ? toWallClockInput(data.endAt, data.allDay, timeZone)
            : undefined,
        allDay: data.allDay,
        location: data.location ?? "",
        externalUrl: data.externalUrl ?? "",
        externalUrlLabel: data.externalUrlLabel ?? "",
        priceLabel: data.priceLabel ?? "",
        published: data.published,
      });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      discardPendingUploads();
      toast.error(err.message ?? "Failed to update event");
    },
    onMutate: () => toast.loading("Updating event..."),
  });

  const deleteMutation = api.events.delete.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Event deleted successfully");
      void utils.events.invalidate();
      router.push("/admin/events");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete event");
    },
    onMutate: () => toast.loading("Deleting event..."),
  });

  const onSubmit = async (data: FormValues) => {
    // Objects uploaded to S3 during THIS submit. Tracked so they can be
    // discarded if anything fails before (or during) the save mutation —
    // otherwise a rejected save leaves orphans with nothing referencing them.
    const uploadedThisSubmit: string[] = [];

    // An event has ONE media slot: a photo OR an uploaded video. Only the
    // ACTIVE tab is resolved — a File sitting in the hidden tab's field is
    // ignored rather than uploaded, so flipping tabs never moves media between
    // columns (and never orphans an object in S3 either, since nothing that
    // isn't saved gets uploaded).
    //
    // Per slot there are three states, and they are NOT interchangeable on the
    // wire:
    //   File      → upload now, save the resulting URL
    //   null      → the owner removed the media, save null to clear the column
    //   undefined → untouched, keep whatever the column already holds
    //               (`undefined` reaches Prisma as "leave this column alone")
    let coverImage: string | null | undefined;
    let coverVideo: string | null | undefined;

    if (mediaKind === "photo") {
      const coverImageFile = data.coverImageFile;
      if (coverImageFile === null) {
        coverImage = null;
      } else if (coverImageFile instanceof File) {
        try {
          const response = await imageUploader.upload(coverImageFile);
          const fileLocation =
            (response.file.objectInfo.metadata?.pathname as
              | string
              | undefined) ?? "";
          if (fileLocation) {
            coverImage = fileLocation;
            uploadedThisSubmit.push(fileLocation);
          }
        } catch {
          toast.error("Failed to upload image.");
          return;
        }
      } else {
        coverImage = data.coverImage ?? undefined;
      }
      // Mutual exclusion, but only when the active slot actually resolves to a
      // URL: that's the one case where the event definitively has a photo, so
      // any saved video must go. When the active slot is untouched (undefined)
      // we send undefined for both — otherwise merely switching to the Photo
      // tab and hitting Save would wipe a saved video. An explicit removal
      // (null) still clears its own column, but leaves the other alone.
      coverVideo = typeof coverImage === "string" ? null : undefined;
    } else {
      const coverVideoFile = data.coverVideoFile;
      if (coverVideoFile === null) {
        coverVideo = null;
      } else if (coverVideoFile instanceof File) {
        try {
          const response = await videoUploader.upload(coverVideoFile);
          const fileLocation =
            (response.file.objectInfo.metadata?.pathname as
              | string
              | undefined) ?? "";
          if (fileLocation) {
            coverVideo = fileLocation;
            uploadedThisSubmit.push(fileLocation);
          }
        } catch {
          toast.error("Failed to upload video.");
          return;
        }
      } else {
        coverVideo = data.coverVideo ?? undefined;
      }
      // Mirror of the guard above, with the slots swapped.
      coverImage = typeof coverVideo === "string" ? null : undefined;
    }

    const payload = {
      name: data.name,
      blurb: data.blurb,
      coverImage,
      coverVideo,
      startAt: data.startAt,
      // Already undefined-or-valid by the time it gets here — the endAt
      // field's onChange (below) converts "" to undefined at input time,
      // since the schema's date regex has no empty-string carve-out.
      endAt: data.endAt,
      allDay: data.allDay ?? false,
      location: data.location,
      externalUrl: data.externalUrl,
      externalUrlLabel: data.externalUrlLabel,
      priceLabel: data.priceLabel,
      published: data.published ?? true,
    };

    // Hand off to the mutation's onError/onSuccess: `mutate` below is
    // fire-and-forget, so this ref is how the mutation callbacks learn what
    // was uploaded during the submit that's now in flight.
    pendingUploadUrlsRef.current = uploadedThisSubmit;

    if (event?.id) {
      updateMutation.mutate({ id: event.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const watchedAllDay = form.watch("allDay") ?? false;

  /**
   * Flipping "all day" must not leave a malformed value sitting in the other
   * input type: a "YYYY-MM-DDTHH:mm" value is invalid inside
   * `<input type="date">`, and a bare "YYYY-MM-DD" is a valid but
   * time-truncated value inside `<input type="datetime-local">` — Chrome
   * renders that one as an empty field. So on every flip we rewrite whatever
   * is currently in startAt/endAt into the shape the new input type expects,
   * rather than just toggling `allDay` and letting the field render the wrong
   * kind of string.
   */
  const handleAllDayChange = (nextAllDay: boolean) => {
    const currentStart = form.getValues("startAt");
    const currentEnd = form.getValues("endAt");

    if (nextAllDay) {
      // datetime-local -> date: keep the calendar date, drop the time.
      if (currentStart) {
        form.setValue("startAt", currentStart.slice(0, 10), {
          shouldDirty: true,
        });
      }
      if (currentEnd) {
        form.setValue("endAt", currentEnd.slice(0, 10), {
          shouldDirty: true,
        });
      }
    } else {
      // date -> datetime-local: seed a time rather than leave a bare date,
      // which datetime-local inputs treat as empty.
      if (currentStart && !currentStart.includes("T")) {
        form.setValue("startAt", `${currentStart}T00:00`, {
          shouldDirty: true,
        });
      }
      if (currentEnd && !currentEnd.includes("T")) {
        form.setValue("endAt", `${currentEnd}T00:00`, {
          shouldDirty: true,
        });
      }
    }

    form.setValue("allDay", nextAllDay, { shouldDirty: true });
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    imageUploader.isPending ||
    videoUploader.isPending;
  const isDeleting = deleteMutation.isPending;
  // No local media state to fold in: the pending cover photo/video are real
  // RHF fields (`coverImageFile` / `coverVideoFile`), so picking or removing
  // one already marks the form dirty. `mediaKind` is intentionally excluded —
  // a bare tab switch changes nothing that would be saved.
  const isDirty = form.formState.isDirty;

  useDirtyForm(isDirty);

  const handleReset = () => {
    // `form.reset()` with no argument restores the current defaults, which
    // clears `coverImageFile` / `coverVideoFile` back to undefined for us.
    form.reset();
    if (coverImageInputRef.current) coverImageInputRef.current.value = "";
    if (coverVideoInputRef.current) coverVideoInputRef.current.value = "";
    // Re-derive from the values just restored, not from the `event` prop — a
    // successful update rewrites the form's defaults, and those (not the
    // possibly stale prop) are what reset puts back.
    setMediaKind(form.getValues("coverVideo") ? "video" : "photo");
  };

  const moreMenuItems: AdminFormMoreMenuItem[] = [
    {
      label: "View on storefront",
      icon: ExternalLink,
      href: "/events",
    },
    {
      label: "Reset",
      icon: RotateCcw,
      disabled: isSubmitting || !isDirty,
      onSelect: handleReset,
    },
    ...(event
      ? [
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            disabled: isSubmitting,
            onSelect: () => setShowDeleteDialog(true),
          } satisfies AdminFormMoreMenuItem,
        ]
      : []),
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
              <Link href="/admin/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="truncate text-base font-medium">
                {event?.id ? (event?.name ?? "Edit Event") : "New Event"}
              </h1>
              <span
                className={cn(
                  "admin-status-badge",
                  `${isDirty ? "isDirty" : "isPublished"} ${!event?.id ? "isNew" : ""}`,
                )}
              >
                {isDirty ? "Unsaved Changes" : !event?.id ? "Draft" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor="event-published" className="text-sm">
                    Published
                  </Label>
                  <Switch
                    id="event-published"
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
          {/* `items-start`: the two columns hold different numbers of cards, and
              grid defaults to `align-items: stretch` — without it the shorter
              column is stretched to the taller one's height, which nothing
              inside consumes. Let each column size to its own content. */}
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Event name, description, and flier photo or video
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Event name{" "}
                          <span className="text-destructive" aria-hidden="true">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Summer Night Market"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="blurb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What's happening, who it's for…"
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

                  {/* Cover media — one slot, photo OR video. Whichever is
                      picked is held as a File and uploaded on Save (see
                      onSubmit), so abandoning the form can't orphan an S3
                      object. Each `existingPreviewUrl` is watched, not read
                      off the `event` prop, so the preview updates the moment a
                      save lands rather than waiting on router.refresh(). Only
                      the active tab's field is rendered; the hidden one keeps
                      its RHF value but onSubmit ignores it. */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label id="event-media-kind-label" className="text-sm">
                        Flier or cover media
                      </Label>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={mediaKind}
                        onValueChange={(value) => {
                          // Radix's `type="single"` ToggleGroup re-fires with
                          // "" when the already-pressed item is clicked again
                          // (it behaves like a toggle, not a radio) — ignore
                          // that rather than clearing the selection to nothing.
                          if (value === "photo" || value === "video") {
                            setMediaKind(value);
                          }
                        }}
                        aria-labelledby="event-media-kind-label"
                        disabled={isSubmitting}
                      >
                        <ToggleGroupItem value="photo" aria-label="Use a photo">
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Photo
                        </ToggleGroupItem>
                        <ToggleGroupItem value="video" aria-label="Use a video">
                          <Video className="mr-2 h-4 w-4" />
                          Video
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {mediaKind === "photo" ? (
                      <ImageUploadFormField
                        form={form}
                        name="coverImageFile"
                        label="Flier or cover image"
                        description="Shown on your events page — visitors can tap it to see it full size."
                        existingPreviewUrl={
                          form.watch("coverImage") ?? undefined
                        }
                        inputRef={coverImageInputRef}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <VideoUploadFormField
                        form={form}
                        name="coverVideoFile"
                        label="Video flier"
                        description="MP4 or WebM recommended, up to 50MB."
                        existingPreviewUrl={
                          form.watch("coverVideo") ?? undefined
                        }
                        inputRef={coverVideoInputRef}
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* When */}
              <Card>
                <CardHeader>
                  <CardTitle>When</CardTitle>
                  <CardDescription>
                    Start and end date, or one all-day date range
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="allDay"
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>All day</FormLabel>
                          <FormDescription>
                            No specific start or end time
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={handleAllDayChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* `items-start` is load-bearing here, not cosmetic. End has
                      a FormDescription and Start doesn't, so End's FormItem is
                      one grid row taller. Under the grid default of
                      `align-items: stretch`, Start's FormItem — itself a
                      `grid gap-2` with all-auto rows — is stretched to match
                      and distributes the extra height into its own rows. Its
                      FormLabel is a `flex items-center` Label, so the text
                      vertically centres in that inflated row and visibly sinks
                      below "End". The h-9 Input can't absorb it either. */}
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Start{" "}
                            <span
                              className="text-destructive"
                              aria-hidden="true"
                            >
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type={watchedAllDay ? "date" : "datetime-local"}
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

                    <FormField
                      control={form.control}
                      name="endAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End</FormLabel>
                          <FormControl>
                            <Input
                              type={watchedAllDay ? "date" : "datetime-local"}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                // "" must become undefined, not an empty
                                // string — eventFormSchema's endAt is an
                                // optional *regex-matched* string, and an
                                // empty string fails that regex instead of
                                // being treated as "not provided".
                                field.onChange(e.target.value || undefined)
                              }
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional — leave blank for a single point in time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Times are shown to visitors in {timeZoneLabel(timeZone)}.
                    Change it in{" "}
                    <Link
                      href="/admin/settings/general"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      Settings → General
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                  <CardDescription>
                    Where it is and how to learn more
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Eastern Market, Detroit"
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

                  <FormField
                    control={form.control}
                    name="externalUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://…"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormDescription>
                          Tickets, a signup form, or a Facebook event — opens in
                          a new tab
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="externalUrlLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link label</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Get tickets"
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

                  <FormField
                    control={form.control}
                    name="priceLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Free, or $10 at the door"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormDescription>
                          Display only — this never charges anyone.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
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
            <AlertDialogTitle>Delete event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {form.watch("name") ?? ""}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(event?.id ?? "");
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
