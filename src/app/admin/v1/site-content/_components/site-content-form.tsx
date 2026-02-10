"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "nextjs-toploader/app";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "~/trpc/react";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

const schema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  keyParam: string;
  defaultValues: FormData;
};

export function SiteContentForm({ keyParam, defaultValues }: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  const updateMutation = api.siteContent.update.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Error updating site content.");
    },
    onSettled: () => {
      void apiUtils.siteContent.invalidate();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    updateMutation.mutate({ key: keyParam, value: data.value });
  };

  const isPending = updateMutation.isPending;
  useKeyboardEnter(form, onSubmit);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Edit site content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputFormField
              form={form}
              name="key"
              label="Key"
              disabled
              placeholder="e.g. hero.headline"
            />
            <TextareaFormField
              form={form}
              name="value"
              label="Value"
              placeholder="Editable text for this key..."
              disabled={isPending}
              rows={8}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
