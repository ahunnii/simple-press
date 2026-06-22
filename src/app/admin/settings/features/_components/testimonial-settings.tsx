"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

type Props = {
  testimonialsAutoApprove: boolean;
};

export function TestimonialSettings({
  testimonialsAutoApprove: initial,
}: Props) {
  const [autoApprove, setAutoApprove] = useState(initial);

  const mutation = api.business.updateTestimonialSettings.useMutation({
    onSuccess() {
      toast.success(
        autoApprove
          ? "Testimonials will now be published immediately"
          : "Testimonials will now require approval before publishing",
      );
    },
    onError(err) {
      // Revert optimistic toggle
      setAutoApprove(!autoApprove);
      toast.error(err.message ?? "Failed to update testimonial settings");
    },
  });

  const handleToggle = (checked: boolean) => {
    setAutoApprove(checked);
    mutation.mutate({ testimonialsAutoApprove: checked });
  };

  return (
    <div className="admin-container pt-0">
      <Card>
        <CardHeader>
          <CardTitle>Testimonial Moderation</CardTitle>
          <CardDescription>
            Control how customer-submitted testimonials are handled before they
            appear on your storefront.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="min-w-0 flex-1 pr-6">
              <Label
                htmlFor="testimonials-auto-approve"
                className="text-sm font-medium"
              >
                Auto-approve testimonials
              </Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                When on, customer-submitted testimonials are published
                immediately. When off (default), they land in a pending state
                and must be approved in the Testimonials admin before appearing.
              </p>
            </div>
            <Switch
              id="testimonials-auto-approve"
              checked={autoApprove}
              disabled={mutation.isPending}
              onCheckedChange={handleToggle}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
