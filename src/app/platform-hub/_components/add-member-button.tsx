"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { AddMemberFormData } from "~/lib/validators/platform";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { addMemberFormSchema } from "~/lib/validators/platform";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { SelectFormField } from "~/components/inputs/select-form-field";

type Props = {
  businessId: string;
};

const defaultValues: AddMemberFormData = {
  userId: "",
  role: "MANAGER",
};

export function AddMemberButton({ businessId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: usersData } = api.platform.listUsers.useQuery();
  const users = usersData?.users ?? [];

  const form = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberFormSchema),
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
        fallbackMessage: "Failed to add member",
      }),
    onSuccess: () => {
      toast.success("Member added to business successfully");
      setOpen(false);
      form.reset(defaultValues);
      router.refresh();
    },
  });

  const onSubmit = (data: AddMemberFormData) => {
    createMembership.mutate({
      userId: data.userId,
      businessId,
      role: data.role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Add Member to Business</DialogTitle>
              <DialogDescription>
                Select a user and role to grant them access to this business.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <SelectFormField
                form={form}
                name="userId"
                label="User"
                placeholder="Select a user"
                values={users.map((user) => ({
                  value: user.id,
                  label: `${user.name} (${user.email})`,
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
                  "Add Member"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
