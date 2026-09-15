"use client";

import type { Content } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type {
  MaintenanceCtaInput,
  MaintenanceCtaType,
} from "~/lib/maintenance-config";
import type { RouterInputs } from "~/trpc/react";
import {
  maintenanceCtaSchema,
  normalizeMaintenanceMessage,
} from "~/lib/maintenance-config";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MinimalTiptapEditor } from "~/components/ui/minimal-tiptap";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";

export type Variant = "maintenance" | "coming_soon";

/** `"none"` is the UI-only stand-in for "no CTA" — it saves as `null`. */
type CtaSelection = MaintenanceCtaType | "none";

type UpdateInput = RouterInputs["business"]["updateMaintenanceMode"];

/** Empty doc handed to the editor when there's no saved message yet. */
const EMPTY_TIPTAP_DOC: TiptapJSON = { type: "doc", content: [] };

/** Matches the `image` route's own cap in `src/app/api/upload/route.ts`. */
const MAX_IMAGE_BYTES = 1024 * 1024 * 5;

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

/**
 * Local copy of the `useObjectUrl` helper in
 * `~/components/inputs/image-upload-form-field.tsx` — that one isn't exported,
 * and this form deliberately doesn't use `ImageUploadFormField` itself (that
 * component is React Hook Form bound; this form is plain `useState` because of
 * its hand-rolled dirty snapshot and offline-confirmation dialog).
 */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

/**
 * `MinimalTiptapEditor`'s `onChange` is typed as TipTap's loose `Content`
 * (string | doc | array | null). With `output="json"` it always hands back a
 * doc, so anything else is treated as "no message". Emptiness itself is
 * decided by `normalizeMaintenanceMessage` at save/dirty-check time, not here.
 */
function asTiptapDoc(value: Content): TiptapJSON | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

/**
 * Order-independent key for the dirty check — the saved CTA comes back from
 * the server through zod, so raw `JSON.stringify` could differ on key order
 * alone.
 */
function ctaKey(cta: MaintenanceCtaInput | null): string {
  return cta ? JSON.stringify([cta.type, cta.label, cta.value ?? ""]) : "none";
}

type Props = {
  initialMaintenanceMode: boolean;
  initialMaintenanceVariant: Variant;
  initialMaintenanceMessage: TiptapJSON | null;
  initialMaintenanceCta: MaintenanceCtaInput | null;
  initialOverline: string;
  initialHeadline: string;
  initialLocation: string;
  /** Persisted flyer URL, or `null` when none is saved. */
  initialImage: string | null;
  /** `"YYYY-MM-DDTHH:mm"` in the business's zone, or `""` when unset. */
  initialLaunchStart: string;
  initialLaunchEnd: string;
  /** `Business.timeZone` — the zone the launch inputs are read in, shown to the owner. */
  timeZone: string;
  businessPhoneNumber: string | null;
  businessSupportEmail: string | null;
};

export function AvailabilityEditor({
  initialMaintenanceMode,
  initialMaintenanceVariant,
  initialMaintenanceMessage,
  initialMaintenanceCta,
  initialOverline,
  initialHeadline,
  initialLocation,
  initialImage,
  initialLaunchStart,
  initialLaunchEnd,
  timeZone,
  businessPhoneNumber,
  businessSupportEmail,
}: Props) {
  const router = useRouter();

  const [maintenanceMode, setMaintenanceMode] = useState(
    initialMaintenanceMode,
  );
  const [maintenanceVariant, setMaintenanceVariant] = useState<Variant>(
    initialMaintenanceVariant,
  );
  const [maintenanceMessage, setMaintenanceMessage] =
    useState<TiptapJSON | null>(initialMaintenanceMessage);

  const [ctaType, setCtaType] = useState<CtaSelection>(
    initialMaintenanceCta?.type ?? "none",
  );
  const [ctaLabel, setCtaLabel] = useState(initialMaintenanceCta?.label ?? "");
  const [ctaValue, setCtaValue] = useState(initialMaintenanceCta?.value ?? "");

  const [overline, setOverline] = useState(initialOverline);
  const [headline, setHeadline] = useState(initialHeadline);
  const [location, setLocation] = useState(initialLocation);
  const [launchStart, setLaunchStart] = useState(initialLaunchStart);
  const [launchEnd, setLaunchEnd] = useState(initialLaunchEnd);

  // Two separate pieces of flyer state: `imageUrl` is what's persisted (set to
  // `null` by Remove), `imageFile` is a picked-but-not-yet-uploaded File. The
  // upload deliberately happens at save time, not at pick time, so abandoning
  // the form never leaves an orphan object in S3.
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useObjectUrl(imageFile);
  const displayedImage = previewUrl ?? imageUrl;

  // Last-saved snapshot. This form is plain `useState` rather than React Hook
  // Form, so there is no `formState.isDirty` to lean on — the snapshot gives us
  // the same signal for `useDirtyForm` (and tells us whether a save is about to
  // take the storefront offline for the first time).
  const [savedState, setSavedState] = useState({
    maintenanceMode: initialMaintenanceMode,
    maintenanceVariant: initialMaintenanceVariant,
    maintenanceMessage: JSON.stringify(
      normalizeMaintenanceMessage(initialMaintenanceMessage),
    ),
    maintenanceCta: ctaKey(initialMaintenanceCta),
    // Text fields are snapshotted trimmed because that's what gets sent —
    // adding trailing whitespace shouldn't count as an unsaved change.
    overline: initialOverline.trim(),
    headline: initialHeadline.trim(),
    location: initialLocation.trim(),
    launchStart: initialLaunchStart,
    launchEnd: initialLaunchEnd,
    imageUrl: initialImage,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  // The CTA the form currently describes — `null` for "none", and the exact
  // object sent to the server on save.
  const cta: MaintenanceCtaInput | null =
    ctaType === "none"
      ? null
      : ctaType === "external"
        ? { type: "external", label: ctaLabel.trim(), value: ctaValue.trim() }
        : ctaType === "call"
          ? {
              type: "call",
              label: ctaLabel.trim(),
              ...(ctaValue.trim() ? { value: ctaValue.trim() } : {}),
            }
          : {
              type: "email",
              label: ctaLabel.trim(),
              ...(ctaValue.trim() ? { value: ctaValue.trim() } : {}),
            };

  const normalizedMessage = normalizeMaintenanceMessage(maintenanceMessage);

  const isDirty =
    maintenanceMode !== savedState.maintenanceMode ||
    maintenanceVariant !== savedState.maintenanceVariant ||
    JSON.stringify(normalizedMessage) !== savedState.maintenanceMessage ||
    ctaKey(cta) !== savedState.maintenanceCta ||
    overline.trim() !== savedState.overline ||
    headline.trim() !== savedState.headline ||
    location.trim() !== savedState.location ||
    launchStart !== savedState.launchStart ||
    launchEnd !== savedState.launchEnd ||
    imageUrl !== savedState.imageUrl ||
    // A staged file is always unsaved work, even if the persisted URL is
    // unchanged (picking a replacement leaves `imageUrl` alone until save).
    imageFile !== null;

  useDirtyForm(isDirty);

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  // Best-effort S3 cleanup when the save that would have referenced an upload
  // fails. Not blocking or user-visible — the caller's error path already ran.
  const discardUploadsMutation = api.upload.discardUploads.useMutation({
    onError: (err, variables) => {
      console.warn(
        "Failed to discard uploaded files; objects may be orphaned in S3:",
        variables.urls,
        err,
      );
    },
  });

  const updateMutation = api.business.updateMaintenanceMode.useMutation({
    onSuccess: () => {
      toast.success("Storefront availability settings saved");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to save settings");
    },
  });

  // The flyer upload runs inside the save, so "busy" is either half of it.
  const isSaving = updateMutation.isPending || imageUploader.isPending;

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    // Same two rules the `image` upload route enforces server-side — checked
    // here so a bad pick fails instantly instead of after a round trip.
    if (!isImageFile(file)) {
      toast.error("Choose an image file — JPG, PNG or WebP");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Images must be 5MB or smaller");
      event.target.value = "";
      return;
    }

    setImageFile(file);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    // Light client-side checks first so the obvious mistakes don't need a
    // round trip; the server's zod schema stays authoritative.
    if (cta) {
      if (!cta.label) {
        toast.error("Add a label for your call-to-action button");
        return;
      }
      if (cta.type === "external" && !cta.value) {
        toast.error("Add a link for your call-to-action button");
        return;
      }

      const parsed = maintenanceCtaSchema.safeParse(cta);
      if (!parsed.success) {
        toast.error(
          parsed.error.issues[0]?.message ??
            "Check your call-to-action button settings",
        );
        return;
      }
    }

    // Both launch inputs are the same fixed `YYYY-MM-DDTHH:mm` shape, so a
    // plain lexicographic compare orders them correctly — no Date parsing (and
    // therefore no ambient-time-zone reading) needed. The server re-checks both
    // of these against the business's own zone.
    if (launchEnd && !launchStart) {
      toast.error("Add a start date before an end time");
      return;
    }
    if (launchEnd && launchStart && launchEnd <= launchStart) {
      toast.error("Launch end must be after the start");
      return;
    }

    // Upload last, once every cheap check has passed: a rejected form should
    // never have put an object in S3 in the first place.
    let uploadedUrl: string | null = null;
    if (imageFile) {
      try {
        const response = await imageUploader.upload(imageFile);
        const pathname =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (!pathname) {
          toast.error("Failed to upload image.");
          return;
        }
        uploadedUrl = pathname;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    }

    const finalImage = uploadedUrl ?? imageUrl;

    const nextSaved = {
      maintenanceMode,
      maintenanceVariant,
      maintenanceMessage: JSON.stringify(normalizedMessage),
      maintenanceCta: ctaKey(cta),
      overline: overline.trim(),
      headline: headline.trim(),
      location: location.trim(),
      launchStart,
      launchEnd,
      imageUrl: finalImage,
    };

    updateMutation.mutate(
      {
        maintenanceMode,
        maintenanceVariant,
        maintenanceMessage:
          normalizedMessage as UpdateInput["maintenanceMessage"],
        maintenanceCta: cta,
        maintenanceOverline: overline.trim() || null,
        maintenanceHeadline: headline.trim() || null,
        maintenanceLocation: location.trim() || null,
        maintenanceImage: finalImage,
        maintenanceLaunchAt: launchStart || null,
        maintenanceLaunchEndAt: launchEnd || null,
      },
      {
        onSuccess: () => {
          setImageUrl(finalImage);
          setImageFile(null);
          // The staged File is now persisted; clearing the input lets the owner
          // re-pick the same file later and still get a change event.
          if (fileInputRef.current) fileInputRef.current.value = "";
          setSavedState(nextSaved);
          setConfirmOpen(false);
        },
        onError: () => {
          // The object reached S3 but nothing references it now.
          if (uploadedUrl) {
            discardUploadsMutation.mutate({ urls: [uploadedUrl] });
          }
        },
      },
    );
  }

  // Only a save that flips the storefront from live → offline needs a
  // confirmation; turning maintenance off, or editing the copy while it is
  // already on, does not.
  const willTakeStorefrontOffline =
    maintenanceMode && !savedState.maintenanceMode;

  return (
    <div className="admin-container space-y-6">
      <div className="admin-header">
        <div>
          <h1>Maintenance Mode</h1>
          <p>
            Control whether your public storefront is accessible to visitors.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            When enabled, every public storefront page — home, shop, product,
            cart, checkout, etc. — is replaced by a single maintenance or
            coming-soon screen for visitors. The page is also marked
            &quot;noindex&quot; so search engines drop it from results while
            it&apos;s active. Checkout is blocked server-side too, so no orders
            can be placed even if a customer already has the checkout page open.
            None of this affects you: your admin dashboard stays fully
            accessible so you can keep working and turn this off when
            you&apos;re ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label
                htmlFor="maintenance-mode-switch"
                className="text-sm font-medium"
              >
                Enable maintenance mode for my storefront
              </Label>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Takes effect immediately for all visitors after you save —
                there&apos;s no scheduling or preview delay. Only the public
                storefront is affected; your admin dashboard stays accessible.
              </p>
            </div>
            <Switch
              id="maintenance-mode-switch"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
              disabled={isSaving}
            />
          </div>

          {/* Conditional fields shown when maintenance is on */}
          {maintenanceMode && (
            <>
              {/* Variant chooser */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Display type</Label>
                <RadioGroup
                  value={maintenanceVariant}
                  onValueChange={(v) => setMaintenanceVariant(v as Variant)}
                  className="gap-3"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="maintenance"
                      id="variant-maintenance"
                    />
                    <Label
                      htmlFor="variant-maintenance"
                      className="cursor-pointer font-normal"
                    >
                      Under maintenance
                      <span className="text-muted-foreground ml-2 text-xs">
                        — site is temporarily unavailable for updates
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="coming_soon"
                      id="variant-coming-soon"
                    />
                    <Label
                      htmlFor="variant-coming-soon"
                      className="cursor-pointer font-normal"
                    >
                      Coming soon
                      <span className="text-muted-foreground ml-2 text-xs">
                        — store is launching soon
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Overline */}
              <div className="space-y-2">
                <Label
                  htmlFor="maintenance-overline"
                  className="text-sm font-medium"
                >
                  Overline{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="maintenance-overline"
                  value={overline}
                  onChange={(e) => setOverline(e.target.value)}
                  maxLength={80}
                  placeholder={
                    maintenanceVariant === "coming_soon"
                      ? "Grand opening"
                      : "Temporarily closed"
                  }
                  disabled={isSaving}
                />
                <p className="text-muted-foreground text-xs">
                  Small label shown above the headline. Leave blank to use the
                  default.
                </p>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <Label
                  htmlFor="maintenance-headline"
                  className="text-sm font-medium"
                >
                  Headline{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="maintenance-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={160}
                  placeholder={
                    maintenanceVariant === "coming_soon"
                      ? "Something beautiful is on its way."
                      : "We'll be back shortly."
                  }
                  disabled={isSaving}
                />
                <p className="text-muted-foreground text-xs">
                  The large heading on the page. Leave blank to use the default.
                </p>
              </div>

              {/* Launch date & time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Launch date &amp; time{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="maintenance-launch-start"
                      className="text-muted-foreground text-xs font-normal"
                    >
                      Starts
                    </Label>
                    <Input
                      id="maintenance-launch-start"
                      type="datetime-local"
                      value={launchStart}
                      onChange={(e) => {
                        const next = e.target.value;
                        setLaunchStart(next);
                        // An end with no start is rejected server-side, so
                        // clearing the start clears the end along with it
                        // rather than leaving an orphan the owner can't see.
                        if (!next) setLaunchEnd("");
                      }}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="maintenance-launch-end"
                      className="text-muted-foreground text-xs font-normal"
                    >
                      Ends (optional)
                    </Label>
                    <Input
                      id="maintenance-launch-end"
                      type="datetime-local"
                      value={launchEnd}
                      min={launchStart || undefined}
                      onChange={(e) => setLaunchEnd(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Times are in {timeZone}. When set, the page shows the date and
                  a live countdown. The countdown reaching zero does not turn
                  maintenance mode off — come back here and switch it off when
                  you open.
                </p>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label
                  htmlFor="maintenance-location"
                  className="text-sm font-medium"
                >
                  Location{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="maintenance-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={200}
                  placeholder="8632 W. McNichols Rd, Detroit, MI"
                  disabled={isSaving}
                />
                <p className="text-muted-foreground text-xs">
                  Shown next to the date. Leave blank to hide.
                </p>
              </div>

              {/* Flyer image */}
              <div className="space-y-2">
                <Label
                  htmlFor="maintenance-image"
                  className="text-sm font-medium"
                >
                  Flyer image{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <input
                  ref={fileInputRef}
                  id="maintenance-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isSaving}
                />
                {displayedImage && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element --
                        an arbitrary S3 URL (or a blob: preview of a file that
                        hasn't been uploaded yet); next/image's loader buys
                        nothing here and would need a remote-pattern entry per
                        storage host. */}
                    <img
                      src={displayedImage}
                      alt="Flyer preview"
                      className="max-h-64 rounded-md border object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {displayedImage ? "Replace image" : "Upload image"}
                  </Button>
                  {displayedImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Optional. JPG, PNG or WebP up to 5MB. Shown above your message
                  on the page.
                </p>
              </div>

              {/* Custom message */}
              <div className="space-y-2">
                <Label
                  htmlFor="maintenance-message"
                  className="text-sm font-medium"
                >
                  Custom message{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <MinimalTiptapEditor
                  value={maintenanceMessage ?? EMPTY_TIPTAP_DOC}
                  onChange={(next) => setMaintenanceMessage(asTiptapDoc(next))}
                  output="json"
                  placeholder="We'll be back soon. Thank you for your patience!"
                  className="w-full"
                  editorContentClassName="min-h-[160px] p-4"
                  editorClassName="focus:outline-hidden"
                  editable={!isSaving}
                />
                <p className="text-muted-foreground text-xs">
                  Shown below the headline — and below the flyer and launch date
                  when you add them. Headings, lists and links are supported.
                  Leave blank to show just the headline.
                </p>
              </div>

              {/* Call-to-action button */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cta-type" className="text-sm font-medium">
                    Call-to-action button{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={ctaType}
                    onValueChange={(v) => {
                      const next = v as CtaSelection;
                      if (next === ctaType) return;
                      setCtaType(next);
                      // A link, phone number, and email address aren't
                      // interchangeable, so the value field starts fresh
                      // whenever the button type changes.
                      setCtaValue("");
                    }}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="cta-type" className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="external">External link</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Adds a single button under your message — a link out to
                    another site, a tap-to-call number, or an email address.
                  </p>
                </div>

                {ctaType !== "none" && (
                  <>
                    <div className="space-y-2">
                      <Label
                        htmlFor="cta-label"
                        className="text-sm font-medium"
                      >
                        Button label
                      </Label>
                      <Input
                        id="cta-label"
                        placeholder="Call to book"
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                        maxLength={80}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="cta-value"
                        className="text-sm font-medium"
                      >
                        {ctaType === "external"
                          ? "Link"
                          : ctaType === "call"
                            ? "Phone number"
                            : "Email address"}{" "}
                        {ctaType !== "external" && (
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        )}
                      </Label>
                      <Input
                        id="cta-value"
                        type={
                          ctaType === "external"
                            ? "url"
                            : ctaType === "call"
                              ? "tel"
                              : "email"
                        }
                        placeholder={
                          ctaType === "external"
                            ? "https://instagram.com/yourshop"
                            : ctaType === "call"
                              ? businessPhoneNumber
                                ? `Defaults to ${businessPhoneNumber}`
                                : "Enter a phone number"
                              : businessSupportEmail
                                ? `Defaults to ${businessSupportEmail}`
                                : "Enter an email address"
                        }
                        value={ctaValue}
                        onChange={(e) => setCtaValue(e.target.value)}
                        disabled={isSaving}
                      />
                      {ctaType === "call" &&
                        !businessPhoneNumber &&
                        !ctaValue.trim() && (
                          <p className="text-muted-foreground text-xs">
                            You don&apos;t have a business phone number saved
                            yet — enter one here, or add it in Settings →
                            General.
                          </p>
                        )}
                      {ctaType === "email" &&
                        !businessSupportEmail &&
                        !ctaValue.trim() && (
                          <p className="text-muted-foreground text-xs">
                            You don&apos;t have a support email saved yet —
                            enter one here, or add it in Settings → General.
                          </p>
                        )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Active warning */}
          {maintenanceMode && (
            <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Storefront is currently offline</AlertTitle>
              <AlertDescription>
                Visitors to your store will see the{" "}
                {maintenanceVariant === "coming_soon"
                  ? "coming soon"
                  : "maintenance"}{" "}
                page until you turn this off.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isSaving}
                  onClick={(e) => {
                    // Only a save that takes the storefront offline opens the
                    // dialog; every other save goes straight through.
                    if (!willTakeStorefrontOffline) {
                      e.preventDefault();
                      void handleSave();
                    }
                  }}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Take your storefront offline?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Every public page — home, shop, product, cart, and checkout
                    — will immediately be replaced by the{" "}
                    {maintenanceVariant === "coming_soon"
                      ? "coming soon"
                      : "maintenance"}{" "}
                    screen, and no new orders can be placed until you turn it
                    back off. Your admin dashboard stays fully accessible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSaving}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isSaving}
                    onClick={(e) => {
                      // Keep the dialog open while the mutation runs — the
                      // `onSuccess` handler closes it.
                      e.preventDefault();
                      void handleSave();
                    }}
                  >
                    {isSaving ? "Saving..." : "Take storefront offline"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
