"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { BusinessTypeId } from "~/lib/admin/setup-plan";
import type { CreateBusinessFormData } from "~/lib/validators/platform";
import {
  FEATURE_PRESETS,
  SETUP_PRESETS,
  TYPE_RELEVANT_FEATURES,
} from "~/lib/admin/setup-plan";
import { TEMPLATES } from "~/lib/constants";
import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { isTemplateAvailableForSubdomain } from "~/lib/template-ownership";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Switch } from "~/components/ui/switch";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";

import { BusinessTypePicker, SetupStepLevelList } from "./setup-plan-fields";

/** Switch values for the "Features" list: registry default + type preset. */
function typeFeatureValues(type: BusinessTypeId): Record<string, boolean> {
  return Object.fromEntries(
    TYPE_RELEVANT_FEATURES.map((key) => [
      key,
      FEATURE_PRESETS[type][key] ??
        FEATURE_REGISTRY[key]?.enabledByDefault ??
        false,
    ]),
  );
}

function typeDefaults(
  type: BusinessTypeId,
): Pick<CreateBusinessFormData, "setupSteps" | "featureFlags"> {
  return {
    setupSteps: { ...SETUP_PRESETS[type] },
    featureFlags: typeFeatureValues(type),
  };
}

const defaultValues: CreateBusinessFormData = {
  name: "",
  subdomain: "",
  templateId: "modern",
  ownerEmail: "",
  businessType: "products",
  ...typeDefaults("products"),
};

/** Copy an invite link, reporting the outcome via toast. */
async function copyInviteLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  } catch {
    toast.error("Could not copy the link");
  }
}

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

  const subdomain = form.watch("subdomain");
  const featureFlags = form.watch("featureFlags");

  // Effective flags as the new store would resolve them: registry defaults,
  // the dialog's switches on top, then dependency cascades. A step whose
  // feature ends up off is hidden from the owner whatever its level.
  const effectiveFlags = { ...getDefaultFlags(), ...featureFlags };
  const disabledByDependency = getDisabledDueToDependency(effectiveFlags);
  const isFeatureOff = (key: string) =>
    effectiveFlags[key] === false || disabledByDependency.has(key);

  const createBusiness = api.platform.createBusiness.useMutation({
    onError: (error) =>
      applyTrpcErrorToForm(form, error, {
        // "template" first: the template error also mentions the subdomain.
        fieldMap: { template: "templateId", subdomain: "subdomain" },
        fallbackMessage: "Failed to create business",
      }),
    onSuccess: (data, variables) => {
      toast.success(`Business "${data.name}" created`);
      // The store exists either way — invite problems are reported, not thrown.
      if (data.invite?.emailSent) {
        toast.success(`Invite sent to ${variables.ownerEmail}`);
      } else if (data.invite) {
        const { inviteUrl } = data.invite;
        toast.warning("Owner invite created but email failed", {
          action: {
            label: "Copy link",
            onClick: () => void copyInviteLink(inviteUrl),
          },
        });
      } else if (data.inviteError) {
        toast.warning(`Owner invite not sent: ${data.inviteError}`, {
          description: "You can invite them from the business page.",
        });
      }
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
    form.setValue("subdomain", value.toLowerCase().replace(/[^a-z0-9-]/g, ""), {
      shouldValidate: true,
    });
  };

  // Changing the type re-fills both lists, overwriting any edits.
  const handleTypeChange = (type: BusinessTypeId) => {
    const next = typeDefaults(type);
    form.setValue("setupSteps", next.setupSteps, { shouldDirty: true });
    form.setValue("featureFlags", next.featureFlags, { shouldDirty: true });
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
    // Only overrides that differ from the registry default are stored, the
    // same shape the business page's feature editor writes.
    const flagOverrides = Object.fromEntries(
      Object.entries(data.featureFlags).filter(
        ([key, value]) => FEATURE_REGISTRY[key]?.enabledByDefault !== value,
      ),
    );
    createBusiness.mutate({
      name: data.name.trim(),
      subdomain: data.subdomain.trim(),
      templateId: data.templateId,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also collapse to undefined, not just null/undefined
      ownerEmail: trimmedOwnerEmail ? trimmedOwnerEmail : undefined,
      businessType: data.businessType,
      setupSteps: data.setupSteps,
      featureFlags: flagOverrides,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Create Business</DialogTitle>
              <DialogDescription>
                Provision a new store manually. The business type sets the
                owner&apos;s setup checklist and starting features. Add an owner
                email to send them an invite now, or invite people from the
                business page afterward.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
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
                  // Commercial templates are locked to their owning subdomain
                  // (re-checked server-side).
                  values={TEMPLATES.map((t) => ({
                    value: t.id,
                    label: t.name,
                    isDisabled:
                      subdomain.length > 0 &&
                      !isTemplateAvailableForSubdomain(t.id, subdomain),
                  }))}
                />
                <InputFormField
                  form={form}
                  name="ownerEmail"
                  label="Owner email (optional)"
                  type="email"
                  placeholder="owner@example.com"
                  description="We'll email them an owner invite."
                />
              </div>

              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business type</FormLabel>
                    <FormControl>
                      <BusinessTypePicker
                        value={field.value}
                        onChange={(type) => {
                          field.onChange(type);
                          handleTypeChange(type);
                        }}
                        idPrefix="business-type"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium">Setup checklist</h3>
                  <p className="text-muted-foreground text-xs">
                    Required steps gate the owner&apos;s setup; optional ones
                    show as suggestions.
                  </p>
                </div>
                <SetupStepLevelList
                  steps={form.watch("setupSteps")}
                  onChange={(key, level) =>
                    form.setValue(`setupSteps.${key}`, level, {
                      shouldDirty: true,
                    })
                  }
                  isFeatureOff={isFeatureOff}
                  idPrefix="setup-step"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium">Features</h3>
                  <p className="text-muted-foreground text-xs">
                    All other features can be changed on the business page.
                  </p>
                </div>
                <div className="divide-y rounded-lg border">
                  {TYPE_RELEVANT_FEATURES.map((key) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`featureFlags.${key}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-3 px-3 py-2">
                          <FormLabel className="font-normal">
                            {FEATURE_REGISTRY[key]?.label ?? key}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
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
