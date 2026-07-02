"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { AddMembershipFormData } from "~/lib/validators/platform";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { addMembershipFormSchema } from "~/lib/validators/platform";
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
import { Form, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { SelectFormField } from "~/components/inputs/select-form-field";

type Props = {
  userId: string;
};

const defaultValues: AddMembershipFormData = {
  businessId: "",
  role: "MANAGER",
};

export function AddMembershipButton({ userId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: businessesData } = api.platform.listBusinesses.useQuery();
  const businesses = businessesData?.businesses ?? [];

  const form = useForm<AddMembershipFormData>({
    resolver: zodResolver(addMembershipFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues);
    }
    setOpen(next);
  };

  const createMembership = api.platform.createMembership.useMutation({
    onError: (error) =>
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to add membership",
      }),
    onSuccess: () => {
      toast.success("User added to business successfully");
      setOpen(false);
      form.reset(defaultValues);
      router.refresh();
    },
  });

  const onSubmit = (data: AddMembershipFormData) => {
    createMembership.mutate({
      userId,
      businessId: data.businessId,
      role: data.role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add to Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Add User to Business</DialogTitle>
              <DialogDescription>
                Select a business and role to grant this user access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <SelectFormField
                form={form}
                name="businessId"
                label="Business"
                placeholder="Select a business"
                values={businesses.map((business) => ({
                  value: business.id,
                  label: `${business.name} (${business.subdomain})`,
                }))}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="OWNER" id="add-owner" />
                        <Label htmlFor="add-owner" className="font-normal">
                          <div>
                            <div className="font-medium">Owner</div>
                            <div className="text-muted-foreground text-sm">
                              Full control of the business
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MANAGER" id="add-manager" />
                        <Label htmlFor="add-manager" className="font-normal">
                          <div>
                            <div className="font-medium">Manager</div>
                            <div className="text-muted-foreground text-sm">
                              Operational access to the business
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="STAFF" id="add-staff" />
                        <Label htmlFor="add-staff" className="font-normal">
                          <div>
                            <div className="font-medium">Staff</div>
                            <div className="text-muted-foreground text-sm">
                              Can view and fulfill orders only
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMembership.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMembership.isPending}>
                {createMembership.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add to Business"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
