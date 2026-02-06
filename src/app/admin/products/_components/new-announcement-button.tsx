"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
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

import { zodResolver } from "@hookform/resolvers/zod";

import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
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
import { Form } from "~/components/ui/form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import type { AnnouncementFormData } from "~/lib/validators/announcement";
import { announcementSchema } from "~/lib/validators/announcement";
import { api } from "~/trpc/react";

export function NewAnnouncementButton() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const apiUtils = api.useUtils();
  const clubsQuery = api.club.getAll.useQuery();

  const createAnnouncementMutation = api.announcement.create.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Error creating announcement.");
      console.error("Error creating announcement:", error);
    },
    onSettled: () => {
      void apiUtils.announcement.invalidate();
    },
  });

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      clubId: "",
      title: "",
      content: "",
    },
  });

  const handleReset = () => {
    form.reset({ clubId: "", title: "", content: "" });
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    if (!data.clubId) {
      toast.error("Please select a club.");
      return;
    }
    toast.info("Creating announcement...");
    createAnnouncementMutation.mutate({
      clubId: data.clubId,
      title: data.title,
      content: data.content,
    });
  };

  const isActionPending = createAnnouncementMutation.isPending;

  useKeyboardEnter(form, onSubmit);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          <Sparkles className="mr-2 h-4 w-4" />
          New announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            ref={formRef}
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="w-full"
          >
            <div className="mb-4 grid max-h-[75svh] gap-4 overflow-y-auto">
              <div className="mb-4 space-y-6">
                <Card className="space-y-2 p-4">
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
                          Club this announcement belongs to.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <InputFormField
                    form={form}
                    name="title"
                    label="Title"
                    placeholder="e.g. Weekly meetup reminder"
                    disabled={isActionPending}
                  />
                  <TextareaFormField
                    form={form}
                    name="content"
                    label="Content"
                    placeholder="Announcement body..."
                    disabled={isActionPending}
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
                Create announcement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
