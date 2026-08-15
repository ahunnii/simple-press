"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

export type Variant = "maintenance" | "coming_soon";

type Props = {
  initialMaintenanceMode: boolean;
  initialMaintenanceVariant: Variant;
  initialMaintenanceMessage: string | null;
};

export function AvailabilityEditor({
  initialMaintenanceMode,
  initialMaintenanceVariant,
  initialMaintenanceMessage,
}: Props) {
  const router = useRouter();

  const [maintenanceMode, setMaintenanceMode] = useState(
    initialMaintenanceMode,
  );
  const [maintenanceVariant, setMaintenanceVariant] = useState<Variant>(
    initialMaintenanceVariant,
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    initialMaintenanceMessage ?? "",
  );

  // Last-saved snapshot. This form is plain `useState` rather than React Hook
  // Form, so there is no `formState.isDirty` to lean on — the snapshot gives us
  // the same signal for `useDirtyForm` (and tells us whether a save is about to
  // take the storefront offline for the first time).
  const [savedState, setSavedState] = useState({
    maintenanceMode: initialMaintenanceMode,
    maintenanceVariant: initialMaintenanceVariant,
    maintenanceMessage: initialMaintenanceMessage ?? "",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDirty =
    maintenanceMode !== savedState.maintenanceMode ||
    maintenanceVariant !== savedState.maintenanceVariant ||
    maintenanceMessage !== savedState.maintenanceMessage;

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
    const nextSaved = {
      maintenanceMode,
      maintenanceVariant,
      maintenanceMessage,
    };

    updateMutation.mutate(
      {
        maintenanceMode,
        maintenanceVariant,
        maintenanceMessage: maintenanceMessage.trim() || undefined,
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

  const charCount = maintenanceMessage.length;

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
                <Textarea
                  id="maintenance-message"
                  placeholder="We'll be back soon. Thank you for your patience!"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={updateMutation.isPending}
                />
                <p className="text-muted-foreground text-xs">
                  Shown below the default heading and subtext on the
                  maintenance/coming-soon screen. Leave blank to show just the
                  default copy for the selected display type above.
                </p>
                <p className="text-muted-foreground text-right text-xs">
                  {charCount} / 500
                </p>
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
