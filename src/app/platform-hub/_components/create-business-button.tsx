"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CreateBusinessFormData } from "~/lib/validators/platform";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { slugify } from "~/lib/utils";
import { createBusinessFormSchema } from "~/lib/validators/platform";
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
import { SelectFormField } from "~/components/inputs/select-form-field";

const TEMPLATES = [
  { id: "modern", label: "Modern" },
  { id: "bamboo", label: "Bamboo" },
  { id: "happy-bamboo", label: "Happy Bamboo" },
  { id: "elegant", label: "Elegant" },
  { id: "pollen", label: "Pollen" },
  { id: "dark-trend", label: "Dark Trend" },
  { id: "noise", label: "Noise" },
  { id: "builders", label: "Builders" },
  { id: "vii", label: "Skinbar VII" },
];

const defaultValues: CreateBusinessFormData = {
  name: "",
  subdomain: "",
  templateId: "modern",
  ownerEmail: "",
};

export function CreateBusinessButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subdomainEdited, setSubdomainEdited] = useState(false);

  const form = useForm<CreateBusinessFormData>({
    resolver: zodResolver(createBusinessFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  const createBusiness = api.platform.createBusiness.useMutation({
    onError: (error) =>
      applyTrpcErrorToForm(form, error, {
        fieldMap: { subdomain: "subdomain" },
        fallbackMessage: "Failed to create business",
      }),
    onSuccess: (data) => {
      toast.success(`Business "${data.name}" created`);
      setOpen(false);
      form.reset(defaultValues);
      setSubdomainEdited(false);
      router.push(`/businesses/${data.id}`);
    },
  });

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!subdomainEdited) {
      form.setValue("subdomain", slugify(value), { shouldValidate: true });
    }
  };

  const handleSubdomainChange = (value: string) => {
    setSubdomainEdited(true);
    form.setValue(
      "subdomain",
      value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      { shouldValidate: true },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues);
      setSubdomainEdited(false);
    }
    setOpen(next);
  };

  const onSubmit = (data: CreateBusinessFormData) => {
    const trimmedOwnerEmail = data.ownerEmail?.trim();
    createBusiness.mutate({
      name: data.name.trim(),
      subdomain: data.subdomain.trim(),
      templateId: data.templateId,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also collapse to undefined, not just null/undefined
      ownerEmail: trimmedOwnerEmail ? trimmedOwnerEmail : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Create Business</DialogTitle>
              <DialogDescription>
                Provision a new store manually. You can add team members from
                the business detail page afterward.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <InputFormField
                form={form}
                name="name"
                label="Business Name"
                placeholder="Acme Store"
                onChange={handleNameChange}
                required
              />
              <InputFormField
                form={form}
                name="subdomain"
                label="Subdomain"
                placeholder="acme-store"
                description="Lowercase letters, numbers, and hyphens only. Min 3 characters."
                onChange={handleSubdomainChange}
                required
              />
              <SelectFormField
                form={form}
                name="templateId"
                label="Template"
                values={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
              />
              <InputFormField
                form={form}
                name="ownerEmail"
                label="Owner Email (optional)"
                type="email"
                placeholder="owner@example.com"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createBusiness.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBusiness.isPending}>
                {createBusiness.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Business"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
