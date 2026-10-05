"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { UpdateBusinessBasicsFormData } from "~/lib/validators/platform";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { updateBusinessBasicsSchema } from "~/lib/validators/platform";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";

type Props = {
  businessId: string;
  name: string;
  ownerEmail: string;
  supportEmail?: string | null;
};

export function EditBusinessBasicsDialog({
  businessId,
  name,
  ownerEmail,
  supportEmail,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateBusinessBasicsFormData>({
    resolver: zodResolver(updateBusinessBasicsSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name, ownerEmail, supportEmail: supportEmail ?? "" },
  });

  // Reseed from the latest server values every time the dialog opens so a
  // cancelled edit (or a refresh after save) never leaves stale text behind.
  useEffect(() => {
    if (open) {
      form.reset({ name, ownerEmail, supportEmail: supportEmail ?? "" });
    }
  }, [open, name, ownerEmail, supportEmail, form]);

  const updateBasics = api.platformBusiness.updateBasics.useMutation({
    onError: (error) =>
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to update business",
      }),
    onSuccess: (data) => {
      toast.success(`${data.name} updated`);
      setOpen(false);
      router.refresh();
    },
  });

  const onSubmit = (data: UpdateBusinessBasicsFormData) => {
    updateBasics.mutate({
      businessId,
      name: data.name.trim(),
      ownerEmail: data.ownerEmail.trim(),
      supportEmail: data.supportEmail?.trim() ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Edit business details</DialogTitle>
              <DialogDescription>
                Update the name and contact emails. The subdomain and custom
                domain are not changed here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <InputFormField
                form={form}
                name="name"
                label="Business Name"
                required
              />
              <InputFormField
                form={form}
                name="ownerEmail"
                label="Owner Email"
                type="email"
                required
              />
              <InputFormField
                form={form}
                name="supportEmail"
                label="Support Email (optional)"
                type="email"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateBasics.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateBasics.isPending}>
                {updateBasics.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
