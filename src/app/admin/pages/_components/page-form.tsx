"use client";

import { useRouter } from "nextjs-toploader/app";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreVertical, Trash2 } from "lucide-react";

import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Form } from "~/components/ui/form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { api } from "~/trpc/react";

import {
  pageEditFormSchema,
  type PageEditFormSchema,
} from "../_validators/page";

export type PageFormDefaultValues = {
  slug: string;
  title: string;
  content: Record<string, unknown>;
};

export function PageForm({
  pageId,
  defaultValues,
}: {
  pageId: string;
  defaultValues: PageFormDefaultValues;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const apiUtils = api.useUtils();

  const updatePageMutation = api.page.update.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Error updating page.");
      console.error("Error updating page:", error);
    },
    onSettled: () => {
      void apiUtils.page.invalidate();
    },
  });

  const deletePageMutation = api.page.delete.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      void apiUtils.page.invalidate();
      router.push("/admin/pages");
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("Error deleting page.");
      console.error("Error deleting page:", error);
    },
  });

  const form = useForm<PageEditFormSchema>({
    resolver: zodResolver(pageEditFormSchema),
    defaultValues,
  });

  const handleReset = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (data: PageEditFormSchema) => {
    updatePageMutation.mutate({
      id: pageId,
      slug: data.slug,
      title: data.title,
      content: data.content,
    });
  };

  const handleDelete = () => {
    deletePageMutation.mutate({ id: pageId });
  };

  const isSubmitting = updatePageMutation.isPending;
  const isDeleting = deletePageMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex w-full flex-col gap-4"
        >
          <div className="sticky top-0 z-10 -mx-4 -mt-4 flex w-[calc(100%+2rem)] justify-center border-b border-border/30 px-4 py-3 transition-all duration-300 md:-mx-6 md:w-[calc(100%+3rem)] md:px-6">
            <div
              className={`flex w-[90%] items-center justify-between gap-2 rounded-full border px-4 py-3 shadow-sm backdrop-blur transition-all duration-300 ${
                isDirty
                  ? "border-amber-200 bg-background/95 shadow-md supports-[backdrop-filter]:bg-background/80 dark:border-amber-800"
                  : "border-border/50 bg-background/60 supports-[backdrop-filter]:bg-background/50"
              }`}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                      Saving...
                    </>
                  ) : (
                    "Update page"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid max-h-[75svh] grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
            <div className="space-y-6">
              <Card className="space-y-4 p-4">
                <InputFormField
                  form={form}
                  name="slug"
                  label="Slug"
                  placeholder="e.g. about-us"
                  disabled={isSubmitting}
                />
                <InputFormField
                  form={form}
                  name="title"
                  label="Title"
                  placeholder="e.g. About our club"
                  disabled={isSubmitting}
                />
                <MinimalTiptapFormField
                  form={form}
                  name="content"
                  label="Content"
                  description="Rich text body. Stored as JSON."
                  disabled={isSubmitting}
                  placeholder="Start writing…"
                  editorContentClassName="min-h-[200px] p-5"
                  output="json"
                />
              </Card>
            </div>
          </div>
        </form>
      </Form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{defaultValues.title}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
