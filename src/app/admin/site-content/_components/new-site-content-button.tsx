"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { api } from "~/trpc/react";

const schema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string(),
});

type FormData = z.infer<typeof schema>;

export function NewSiteContentButton() {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [open, setOpen] = useState(false);

  const createMutation = api.siteContent.create.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
      form.reset({ key: "", value: "" });
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "Error creating site content.");
    },
    onSettled: () => {
      void apiUtils.siteContent.invalidate();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { key: "", value: "" },
  });

  const handleReset = () => {
    form.reset({ key: "", value: "" });
  };

  const onSubmit = async (data: FormData) => {
    createMutation.mutate({ key: data.key.trim(), value: data.value });
  };

  const isPending = createMutation.isPending;
  useKeyboardEnter(form, onSubmit);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          <Sparkles className="mr-2 h-4 w-4" />
          Add key
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add site content</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <InputFormField
              form={form}
              name="key"
              label="Key"
              placeholder="e.g. hero.headline"
              disabled={isPending}
            />
            <TextareaFormField
              form={form}
              name="value"
              label="Value"
              placeholder="Editable text for this key..."
              disabled={isPending}
              rows={4}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleReset}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                    Creating…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
