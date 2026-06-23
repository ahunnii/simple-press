"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
    updateMutation.mutate({
      maintenanceMode,
      maintenanceVariant,
      maintenanceMessage: maintenanceMessage.trim() || undefined,
    });
  }

  const charCount = maintenanceMessage.length;

  return (
    <div className="admin-container space-y-6">
      <div className="admin-header">
        <div>
          <h1>Storefront Availability</h1>
          <p>
            Control whether your public storefront is accessible to visitors.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>
            When enabled, visitors to your storefront will see a maintenance or
            coming-soon page instead of your store. Your admin dashboard remains
            fully accessible.
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
                Only affects the public storefront — your admin dashboard stays
                accessible.
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
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
