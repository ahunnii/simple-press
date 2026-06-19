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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  initialEnabled: boolean;
  initialMessage: string | null;
};

export function MaintenanceControl({ initialEnabled, initialMessage }: Props) {
  const router = useRouter();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(initialMessage ?? "");

  const setMaintenanceMutation = api.platform.setMaintenance.useMutation({
    onSuccess: () => {
      toast.success("Platform maintenance settings saved");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to save maintenance settings");
    },
  });

  function handleSave() {
    setMaintenanceMutation.mutate({
      enabled,
      message: message.trim() || undefined,
    });
  }

  const charCount = message.length;

  return (
    <div className="space-y-6">
      {/* Critical warning — always visible when active */}
      {enabled && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Platform maintenance is currently ON</AlertTitle>
          <AlertDescription>
            All storefronts and business-owner admin dashboards are locked out.
            Only platform admins retain access. Turn this off as soon as
            maintenance is complete.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Platform-wide Maintenance</CardTitle>
          <CardDescription>
            When enabled, every storefront and every business-owner admin
            dashboard is replaced with a maintenance page. Only platform
            administrators (like you) retain access to the platform hub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label
                htmlFor="platform-maintenance-switch"
                className="text-sm font-medium"
              >
                Enable platform-wide maintenance mode
              </Label>
              <p className="mt-0.5 text-sm text-gray-500">
                Locks out ALL storefronts and ALL business-owner dashboards.
                Only platform admins keep access.
              </p>
            </div>
            <Switch
              id="platform-maintenance-switch"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={setMaintenanceMutation.isPending}
            />
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <Label
              htmlFor="platform-maintenance-message"
              className="text-sm font-medium"
            >
              Custom message{" "}
              <span className="font-normal text-gray-500">(optional)</span>
            </Label>
            <Textarea
              id="platform-maintenance-message"
              placeholder="The platform is currently undergoing scheduled maintenance. We'll be back shortly."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={setMaintenanceMutation.isPending}
            />
            <p className="text-right text-xs text-gray-400">
              {charCount} / 500
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={setMaintenanceMutation.isPending}
              variant={enabled ? "destructive" : "default"}
            >
              {setMaintenanceMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
