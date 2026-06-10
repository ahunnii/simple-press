"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatDate } from "~/lib/format-date";
import { api } from "~/trpc/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type CustomerPrivacyActionsProps = {
  customer: {
    id: string;
    deletionRequestedAt: Date | null;
    anonymizedAt: Date | null;
  };
};

export function CustomerPrivacyActions({
  customer,
}: CustomerPrivacyActionsProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);

  const anonymizeMutation = api.customer.anonymize.useMutation({
    onSuccess: () => {
      toast.success("Customer anonymized successfully.");
      void utils.customer.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to anonymize customer.");
    },
  });

  if (customer.anonymizedAt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Anonymized on {formatDate(customer.anonymizedAt)}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.deletionRequestedAt && (
            <Alert variant="destructive">
              <AlertTitle>Deletion Requested</AlertTitle>
              <AlertDescription>
                Customer requested deletion on{" "}
                {formatDate(customer.deletionRequestedAt)}.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <p className="text-muted-foreground mb-3 text-sm">
              Anonymizing scrubs this customer&apos;s name, email, phone, and
              addresses. Order records are retained (anonymized) for tax and
              legal purposes.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              Anonymize customer
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anonymize this customer?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>This action is irreversible and will:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Scrub name, email, and phone from the customer record</li>
                  <li>Redact all saved shipping addresses</li>
                  <li>
                    Redact the customer&apos;s name on any public reviews and
                    testimonials
                  </li>
                  <li>
                    Retain order records (anonymized) for tax and legal
                    compliance
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={anonymizeMutation.isPending}
              onClick={() => {
                setDialogOpen(false);
                anonymizeMutation.mutate({ id: customer.id });
              }}
            >
              {anonymizeMutation.isPending ? "Anonymizing…" : "Anonymize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
