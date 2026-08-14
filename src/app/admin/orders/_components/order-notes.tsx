"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

const orderNotesFormSchema = z.object({
  internalNote: z.string(),
});

type OrderNotesFormData = z.infer<typeof orderNotesFormSchema>;

type Props = {
  orderId: string;
  internalNote: string | null;
  customerNote: string | null;
  /**
   * D2: STAFF (fulfillment-only) may not read or write the internal note.
   * When false the whole internal-note block, the Edit affordance and the
   * `order.updateNote` wiring are skipped — and if there is no customer note
   * either, the card renders nothing at all rather than an empty "Notes" shell.
   * The server enforces both halves independently (`order.getById` nulls the
   * field, `order.updateNote` is `ownerAdminProcedure`); this is the UI half.
   */
  canViewInternalNote?: boolean;
};

export function OrderNotes({
  orderId,
  internalNote,
  customerNote,
  canViewInternalNote = true,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const defaultValues: OrderNotesFormData = {
    internalNote: internalNote ?? "",
  };

  const form = useForm<OrderNotesFormData>({
    resolver: zodResolver(orderNotesFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const updateNote = api.order.updateNote.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Note saved");
      setIsEditing(false);
      form.reset({ internalNote: data.internalNote ?? "" });
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      applyTrpcErrorToForm(form, err);
    },
    onMutate: () => {
      toast.loading("Saving note...");
    },
  });

  const onSubmit = (data: OrderNotesFormData) => {
    updateNote.mutate({
      orderId,
      internalNote: data.internalNote.trim() || null,
    });
  };

  const handleCancel = () => {
    form.reset(defaultValues);
    setIsEditing(false);
  };

  // Everything above is a hook and must run unconditionally, so the D2 gate is
  // applied here rather than as an early return at the top. With the internal
  // note hidden and no customer note to show, the card would be an empty
  // "Notes" shell — render nothing instead.
  if (!canViewInternalNote && !customerNote) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notes</CardTitle>
          {canViewInternalNote && !isEditing && (
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
      <CardContent className="space-y-4">
        {/* Internal note — owner/manager only (D2), editable */}
        {canViewInternalNote && (
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Internal Note
              <span className="text-muted-foreground/70 ml-1 normal-case">
                (not visible to customer)
              </span>
            </p>

            {isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2"
                >
                  <TextareaFormField
                    form={form}
                    name="internalNote"
                    label="Internal Note"
                    placeholder="Add an internal note..."
                    rows={4}
                    textareaClassName="resize-none text-sm"
                    textareaRef={textareaRef}
                    labelClassName="sr-only"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={updateNote.isPending}
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={updateNote.isPending}
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
                {internalNote ?? (
                  <span className="text-muted-foreground italic">
                    No internal note
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Customer note — read-only, only shown if present. Visible to every
            admin tier including STAFF: the shopper wrote it for whoever packs
            the order. The top border only earns its keep when there is an
            internal-note block above it to divide from. */}
        {customerNote && (
          <div className={cn(canViewInternalNote && "border-t pt-4")}>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Customer Note
            </p>
            <p className="text-foreground text-sm whitespace-pre-wrap">
              {customerNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
