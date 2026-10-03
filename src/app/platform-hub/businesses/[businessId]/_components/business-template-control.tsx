"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "~/trpc/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Props = {
  businessId: string;
  businessName: string;
  currentTemplateId: string;
  options: { id: string; name: string }[];
};

export function BusinessTemplateControl({
  businessId,
  businessName,
  currentTemplateId,
  options,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const nameFor = (id: string) => options.find((o) => o.id === id)?.name ?? id;

  const setTemplate = api.platformBusiness.setTemplate.useMutation({
    onSuccess: () => {
      toast.success(
        `${businessName} now uses the ${nameFor(pendingId ?? currentTemplateId)} template.`,
      );
      setPendingId(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to switch template");
      setPendingId(null);
    },
  });

  return (
    <>
      <Select
        value={currentTemplateId}
        onValueChange={(next) => {
          if (next !== currentTemplateId) setPendingId(next);
        }}
        disabled={setTemplate.isPending}
      >
        <SelectTrigger className="w-56" aria-label="Template">
          <SelectValue placeholder="Select a template" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={!!pendingId}
        onOpenChange={(open) => {
          if (!open && !setTemplate.isPending) setPendingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Switch ${businessName} from ${nameFor(currentTemplateId)} to ${pendingId ? nameFor(pendingId) : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The live storefront changes immediately. Content stays, but
              template-specific fields and sections may look different or be
              missing under the new template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setTemplate.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingId) {
                  setTemplate.mutate({ businessId, templateId: pendingId });
                }
              }}
              disabled={setTemplate.isPending}
            >
              {setTemplate.isPending ? "Switching…" : "Switch template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
