"use client";

import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { PageFormData } from "~/lib/validators/page";
import { EMPTY_TIPTAP_DOC, pageSchema } from "~/lib/validators/page";
import { api } from "~/trpc/react";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";

export function NewPageButton() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const apiUtils = api.useUtils();
  const clubsQuery = api.club.getAll.useQuery();

  const createPageMutation = api.page.create.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Error creating page.");
      console.error("Error creating page:", error);
    },
    onSettled: () => {
      void apiUtils.page.invalidate();
    },
  });

  const form = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      clubId: "",
      slug: "",
      title: "",
      content: { ...EMPTY_TIPTAP_DOC },
    },
  });

  const handleReset = () => {
    form.reset({
      clubId: "",
      slug: "",
      title: "",
      content: { ...EMPTY_TIPTAP_DOC },
    });
  };

  const onSubmit = async (data: PageFormData) => {
    if (!data.clubId) {
      toast.error("Please select a club.");
      return;
    }
    toast.info("Creating page...");
    createPageMutation.mutate({
      clubId: data.clubId,
      slug: data.slug,
      title: data.title,
      content: data.content,
    });
  };

  const isActionPending = createPageMutation.isPending;

  useKeyboardEnter(form, onSubmit);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          <Sparkles className="mr-2 h-4 w-4" />
          New page
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New page</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            ref={formRef}
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="w-full"
          >
            <div className="mb-4 grid max-h-[75svh] gap-4 overflow-y-auto">
              <div className="space-y-6">
                <Card className="space-y-4 p-4">
                  <FormField
                    control={form.control}
                    name="clubId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isActionPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a club" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(clubsQuery.data ?? []).map((club) => (
                              <SelectItem key={club.id} value={club.id}>
                                {club.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Club this page belongs to.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <InputFormField
                    form={form}
                    name="slug"
                    label="Slug"
                    placeholder="e.g. about-us"
                    disabled={isActionPending}
                  />
                  <InputFormField
                    form={form}
                    name="title"
                    label="Title"
                    placeholder="e.g. About our club"
                    disabled={isActionPending}
                  />
                  <MinimalTiptapFormField
                    form={form}
                    name="content"
                    label="Content"
                    description="Rich text body. Stored as JSON."
                    disabled={isActionPending}
                    placeholder="Start writing…"
                    editorContentClassName="min-h-[200px] p-5"
                    output="json"
                  />
                </Card>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={handleReset}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isActionPending}>
                Create page
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
