"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";

// Mirrors `customer.updateNotes` in `src/server/api/routers/customer.ts`,
// which accepts `z.string().nullable()` with no length constraint.
const customerNotesFormSchema = z.object({
  notes: z.string(),
});

type CustomerNotesFormData = z.infer<typeof customerNotesFormSchema>;

type Props = {
  customerId: string;
  notes: string | null;
};

export function CustomerNotes({ customerId, notes }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<CustomerNotesFormData>({
    resolver: zodResolver(customerNotesFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { notes: notes ?? "" },
  });

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const updateNotes = api.customer.updateNotes.useMutation({
    onSuccess: (_data, variables) => {
      toast.dismiss();
      toast.success("Notes saved");
      setIsEditing(false);
      form.reset({ notes: variables.notes ?? "" });
      void utils.customer.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      applyTrpcErrorToForm(form, err, {
        fallbackMessage: "Failed to save notes",
      });
    },
    onMutate: () => {
      toast.loading("Saving notes...");
    },
  });

  const onSubmit = (data: CustomerNotesFormData) => {
    updateNotes.mutate({
      customerId,
      notes: data.notes.trim() || null,
    });
  };

  const handleCancel = () => {
    form.reset({ notes: notes ?? "" });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notes</CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground h-7 gap-1.5 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
          Internal Notes
          <span className="text-muted-foreground/70 ml-1 normal-case">
            (not visible to customer)
          </span>
        </p>

        {isEditing ? (
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
              className="space-y-2"
            >
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormControl>
                      <Textarea
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          textareaRef.current = el;
                        }}
                        placeholder="Add notes about this customer..."
                        rows={4}
                        className="resize-none text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateNotes.isPending}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={updateNotes.isPending}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <p
            className="text-foreground min-h-8 cursor-text text-sm whitespace-pre-wrap"
            onClick={() => setIsEditing(true)}
          >
            {notes ?? (
              <span className="text-muted-foreground italic">No notes</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
