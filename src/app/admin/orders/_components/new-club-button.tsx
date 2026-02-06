"use client";

import { useUploadFiles } from "@better-upload/client";
import { Sparkles } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { zodResolver } from "@hookform/resolvers/zod";

import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
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
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Form } from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { CLUB_TYPES } from "~/lib/validators/club";
import { api } from "~/trpc/react";

import { clubFormSchema, type ClubFormSchema } from "../_validators/club";

function getStoredPath(file: {
  objectInfo?: {
    key?: string;
    path?: string;
    metadata?: { pathname?: string };
  };
}): string {
  return (
    file.objectInfo?.key ??
    (file.objectInfo as { path?: string })?.path ??
    file.objectInfo?.metadata?.pathname ??
    ""
  );
}

export function NewClubButton() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const apiUtils = api.useUtils();

  const logoUploader = useUploadFiles({
    api: "/api/upload",
    route: "logo",
    onError: (error) => {
      toast.error(error.message ?? "Logo upload failed.");
    },
  });

  const imageUploader = useUploadFiles({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Cover image upload failed.");
    },
  });

  const createClubMutation = api.club.create.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Error creating club.");
      console.error("Error creating club:", error);
    },
    onSettled: () => {
      void apiUtils.club.invalidate();
    },
  });

  const form = useForm<ClubFormSchema>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      name: "My Club",
      description: "",
      slug: "",
      image: "",
      logo: "",
      logoFile: null,
      imageFile: null,
      type: "OTHER",
      isFeatured: false,
      highlights: [],
      leaders: [],
      resources: [],
      gallery: [],
    },
  });

  const handleReset = () => {
    form.reset({
      name: "My Club",
      description: "",
      slug: "",
      image: "",
      logo: "",
      logoFile: null,
      imageFile: null,
      type: "OTHER",
      isFeatured: false,
      highlights: [],
      leaders: [],
      resources: [],
      gallery: [],
    });
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  };

  const onSubmit = async (data: ClubFormSchema) => {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    let logoUrl: string | undefined = data.logo ?? undefined;
    let imageUrl: string | undefined = data.image ?? undefined;

    const logoFile = data.logoFile;
    if (logoFile instanceof File) {
      try {
        const { files } = await logoUploader.upload([logoFile]);
        const path = files[0] ? getStoredPath(files[0]) : "";
        if (path) logoUrl = path;
      } catch {
        toast.error("Failed to upload logo.");
        return;
      }
    }

    const imageFile = data.imageFile;
    if (imageFile instanceof File) {
      try {
        const { files } = await imageUploader.upload([imageFile]);
        const path = files[0] ? getStoredPath(files[0]) : "";
        if (path) imageUrl = path;
      } catch {
        toast.error("Failed to upload cover image.");
        return;
      }
    }

    toast.info("Creating club...");
    createClubMutation.mutate({
      name: data.name,
      description: data.description,
      slug: data.slug,
      image: imageUrl,
      logo: logoUrl,
      type: data.type,
      isFeatured: data.isFeatured,
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  };

  const isActionPending =
    createClubMutation.isPending ||
    logoUploader.isPending ||
    imageUploader.isPending;

  useKeyboardEnter(form, onSubmit);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          <Sparkles className="mr-2 h-4 w-4" />
          New club
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>New club</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            ref={formRef}
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="w-full"
          >
            <div className="mb-4 grid max-h-[75svh] grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
              <div className="space-y-6">
                <Card className="space-y-2 p-4">
                  <InputFormField
                    form={form}
                    name="name"
                    label="Name"
                    placeholder="e.g. Sankofa Adinkra"
                    disabled={isActionPending}
                  />
                  <InputFormField
                    form={form}
                    name="slug"
                    label="Slug"
                    placeholder="e.g. sankofa-adinkra"
                    disabled={isActionPending}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isActionPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CLUB_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t
                                  .split("_")
                                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                                  .join(" ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="text-base">Featured</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isActionPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <TextareaFormField
                    form={form}
                    name="description"
                    label="Description (optional)"
                    placeholder="e.g. Collection of Sankofa Adinkra designs and symbols"
                    disabled={isActionPending}
                  />
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="space-y-4 p-4">
                  <ImageUploadFormField
                    form={form}
                    name="logoFile"
                    label="Logo"
                    description="Upload a logo image. Submitted on save."
                    disabled={isActionPending}
                    inputRef={logoFileInputRef}
                  />
                  <ImageUploadFormField
                    form={form}
                    name="imageFile"
                    label="Cover image"
                    description="Upload a cover image. Submitted on save."
                    disabled={isActionPending}
                    inputRef={imageFileInputRef}
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
                {isActionPending &&
                (logoUploader.isPending || imageUploader.isPending) ? (
                  <>
                    <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                    Uploading...
                  </>
                ) : isActionPending ? (
                  <>
                    <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                    Creating...
                  </>
                ) : (
                  "Create club"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
