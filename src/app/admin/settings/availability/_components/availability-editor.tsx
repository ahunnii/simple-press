"use client";

import type { Content } from "@tiptap/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  businessPhoneNumber: string | null;
  businessSupportEmail: string | null;
};

export function AvailabilityEditor({
  initialMaintenanceMode,
  initialMaintenanceVariant,
  initialMaintenanceMessage,
  initialMaintenanceCta,
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
    ctaKey(cta) !== savedState.maintenanceCta;

  useDirtyForm(isDirty);

  const updateMutation = api.business.updateMaintenanceMode.useMutation({
    onSuccess: () => {
      toast.success("Storefront availability settings saved");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to save settings");
    },
  });

  function handleSave() {
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

    const nextSaved = {
      maintenanceMode,
      maintenanceVariant,
      maintenanceMessage: JSON.stringify(normalizedMessage),
      maintenanceCta: ctaKey(cta),
    };

    updateMutation.mutate(
      {
        maintenanceMode,
        maintenanceVariant,
        maintenanceMessage:
          normalizedMessage as UpdateInput["maintenanceMessage"],
        maintenanceCta: cta,
      },
      {
        onSuccess: () => {
          setSavedState(nextSaved);
          setConfirmOpen(false);
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
              disabled={updateMutation.isPending}
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
                  editable={!updateMutation.isPending}
                />
                <p className="text-muted-foreground text-xs">
                  Shown below the default heading and subtext on the
                  maintenance/coming-soon screen. Basic formatting is supported.
                  Leave blank to show just the default copy for the selected
                  display type above.
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
                    disabled={updateMutation.isPending}
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
                        disabled={updateMutation.isPending}
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
                        disabled={updateMutation.isPending}
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
                  disabled={updateMutation.isPending}
                  onClick={(e) => {
                    // Only a save that takes the storefront offline opens the
                    // dialog; every other save goes straight through.
                    if (!willTakeStorefrontOffline) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                >
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
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
                  <AlertDialogCancel disabled={updateMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={updateMutation.isPending}
                    onClick={(e) => {
                      // Keep the dialog open while the mutation runs — the
                      // `onSuccess` handler closes it.
                      e.preventDefault();
                      handleSave();
                    }}
                  >
                    {updateMutation.isPending
                      ? "Saving..."
                      : "Take storefront offline"}
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
