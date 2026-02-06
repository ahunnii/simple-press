"use client";

import { useRouter } from "nextjs-toploader/app";
import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useUploadFiles } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  MoreVertical,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { FileUploadFormField } from "~/components/inputs/file-upload-form-field";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
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
import { Form, FormField } from "~/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import {
  CLUB_TYPES,
  LEADER_ROLES,
  type ClubFormData,
} from "~/lib/validators/club";
import { api } from "~/trpc/react";

import Link from "next/link";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { env } from "~/env";
import { clubFormSchema, type ClubFormSchema } from "../_validators/club";

function isDirectFileUrl(url: string): boolean {
  // Check if URL ends with a file extension (image or document)
  const fileExtensionPattern =
    /\.(jpg|jpeg|png|gif|webp|bmp|pdf|doc|docx)(\?.*)?$/i;
  return fileExtensionPattern.test(url);
}

function getStoredPath(file: {
  objectInfo?: {
    key?: string;
    path?: string;
    metadata?: { pathname?: string };
  };
}): string {
  return `https://${env.NEXT_PUBLIC_STORAGE_URL}/${env.NEXT_PUBLIC_STORAGE_BUCKET_NAME}/${file.objectInfo?.key ?? ""}`;
}

type Props = {
  clubId: string;
  defaultValues: ClubFormData;
};

export function ClubForm({ clubId, defaultValues }: Props) {
  // const { data: session } = useSession();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const galleryUploader = useUploadFiles({
    api: "/api/upload",
    route: "gallery",
    onError: (error) => {
      toast.error(error.message ?? "Gallery image upload failed.");
    },
  });

  const leaderImageUploader = useUploadFiles({
    api: "/api/upload",
    route: "leader",
    onError: (error) => {
      toast.error(error.message ?? "Leader image upload failed.");
    },
  });

  const resourceFileUploader = useUploadFiles({
    api: "/api/upload",
    route: "resource",
    onError: (error) => {
      toast.error(error.message ?? "Resource file upload failed.");
    },
  });

  const updateClubMutation = api.club.update.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Error updating club.");
      console.error("Error updating club:", error);
    },
    onSettled: () => {
      router.refresh();
      void apiUtils.club.invalidate();
      form.reset();
    },
  });

  const deleteClubMutation = api.club.delete.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      void apiUtils.club.invalidate();
      router.push("/admin/clubs");
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("Error deleting club.");
      console.error("Error deleting club:", error);
    },
  });

  const form = useForm<ClubFormSchema>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      ...defaultValues,
      highlights: defaultValues.highlights ?? [],
      leaders: (defaultValues.leaders ?? []).map((l) => ({
        ...l,
        imageFile: null as File | null,
      })),
      resources: (defaultValues.resources ?? []).map((r) => ({
        ...r,
        file: null as File | null,
        // If URL exists and is a direct file link, use file upload mode; otherwise URL mode
        useUrl: r.url ? !isDirectFileUrl(r.url) : false,
      })),
      gallery: (defaultValues.gallery ?? []).map((g) => ({
        ...g,
        file: null as File | null,
      })),
      logoFile: null,
      imageFile: null,
    },
  });

  const leadersField = useFieldArray({
    control: form.control,
    name: "leaders",
  });
  const resourcesField = useFieldArray({
    control: form.control,
    name: "resources",
  });
  // useFieldArray name type omits string[] paths; cast to satisfy
  const highlightsField = useFieldArray({
    control: form.control,
    name: "highlights" as "leaders" | "resources" | "gallery",
  }) as unknown as {
    fields: { id: string }[];
    append: (value: string) => void;
    remove: (index: number) => void;
  };
  const galleryField = useFieldArray({
    control: form.control,
    name: "gallery",
  });

  const handleReset = () => {
    form.reset({
      ...defaultValues,
      highlights: defaultValues.highlights ?? [],
      leaders: (defaultValues.leaders ?? []).map((l) => ({
        ...l,
        imageFile: null as File | null,
      })),
      resources: (defaultValues.resources ?? []).map((r) => ({
        ...r,
        file: null as File | null,
        // If URL exists and is a direct file link, use file upload mode; otherwise URL mode
        useUrl: r.url ? !isDirectFileUrl(r.url) : false,
      })),
      gallery: (defaultValues.gallery ?? []).map((g) => ({
        ...g,
        file: null as File | null,
      })),
      logoFile: null,
      imageFile: null,
    });
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  };

  const handleDelete = () => {
    deleteClubMutation.mutate({ id: clubId });
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

    const galleryPayload: { url: string; alt: string }[] = [];
    for (let i = 0; i < (data.gallery ?? []).length; i++) {
      const g = data.gallery[i];
      const alt = g?.alt?.trim();
      if (!alt) continue;
      let url: string | undefined = g?.url?.trim() ?? undefined;
      if (g?.file instanceof File) {
        try {
          const { files } = await galleryUploader.upload([g.file]);

          const path = files[0] ? getStoredPath(files[0]) : "";
          if (path) url = path;
        } catch {
          toast.error(`Failed to upload gallery image ${i + 1}.`);
          return;
        }
      }
      if (url) galleryPayload.push({ url, alt });
    }

    // Upload leader images
    const leadersPayload: {
      name: string;
      role:
        | "PRESIDENT"
        | "VICE_PRESIDENT"
        | "SECRETARY"
        | "TREASURER"
        | "MEMBER"
        | "MODERATOR"
        | "OWNER"
        | "CHAIRMAN"
        | "VICE_CHAIR"
        | "CAPTAIN";
      image?: string;
    }[] = [];
    for (let i = 0; i < (data.leaders ?? []).length; i++) {
      const l = data.leaders[i];
      if (!l?.name?.trim()) continue;
      let imageUrl: string | undefined = l?.image?.trim() ?? undefined;
      if (l?.imageFile instanceof File) {
        try {
          const { files } = await leaderImageUploader.upload([l.imageFile]);
          const path = files[0] ? getStoredPath(files[0]) : "";
          if (path) imageUrl = path;
        } catch {
          toast.error(`Failed to upload leader image for ${l.name}.`);
          return;
        }
      }
      leadersPayload.push({
        name: l.name,
        role: l.role,
        image: imageUrl,
      });
    }

    // Upload resource files
    const resourcesPayload: { url: string; name: string; type?: string }[] = [];
    for (let i = 0; i < (data.resources ?? []).length; i++) {
      const r = data.resources[i];
      if (!r?.name?.trim()) continue;
      let url: string | undefined;

      // If useUrl is true, use the URL field; otherwise upload the file
      if (r.useUrl) {
        url = r?.url?.trim() ?? undefined;
      } else if (r?.file instanceof File) {
        try {
          const { files } = await resourceFileUploader.upload([r.file]);
          const path = files[0] ? getStoredPath(files[0]) : "";
          if (path) url = path;
        } catch {
          toast.error(`Failed to upload resource file for ${r.name}.`);
          return;
        }
      }

      if (!url) continue; // Resource must have a URL (either uploaded or existing)
      resourcesPayload.push({
        url,
        name: r.name,
        type: r.type ?? undefined,
      });
    }

    updateClubMutation.mutate({
      id: clubId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? undefined,
      logo: logoUrl,
      image: imageUrl,
      type: data.type,
      isFeatured: data.isFeatured,
      tagline: data.tagline ?? undefined,
      quickDescription: data.quickDescription ?? undefined,
      email: data.email?.trim() ? data.email : undefined,
      highlights: data.highlights ?? [],
      leaders: leadersPayload,
      resources: resourcesPayload,
      gallery: galleryPayload,
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  };

  const isSubmitting =
    updateClubMutation.isPending ||
    logoUploader.isPending ||
    imageUploader.isPending ||
    galleryUploader.isPending ||
    leaderImageUploader.isPending ||
    resourceFileUploader.isPending;
  const isDeleting = deleteClubMutation.isPending;
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
          <div className="border-border/30 sticky top-0 z-10 -mx-4 -mt-4 flex w-[calc(100%+2rem)] justify-center border-b px-4 py-3 transition-all duration-300 md:-mx-6 md:w-[calc(100%+3rem)] md:px-6">
            <div
              className={`flex w-[90%] items-center justify-between gap-2 rounded-full border px-4 py-3 shadow-sm backdrop-blur transition-all duration-300 ${
                isDirty
                  ? "bg-background/95 supports-[backdrop-filter]:bg-background/80 border-amber-200 shadow-md dark:border-amber-800"
                  : "border-border/50 bg-background/60 supports-[backdrop-filter]:bg-background/50"
              }`}
            >
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/clubs">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              <div className="flex gap-2">
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
                      Delete club
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                      {logoUploader.isPending ||
                      imageUploader.isPending ||
                      galleryUploader.isPending ||
                      leaderImageUploader.isPending ||
                      resourceFileUploader.isPending
                        ? "Uploading..."
                        : "Saving..."}
                    </>
                  ) : (
                    "Update club"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="basics" className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="basics" className="gap-1.5">
                  <LayoutGrid className="h-4 w-4" />
                  Basics
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-1.5">
                  <Users className="h-4 w-4" />
                  Team & content
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-1.5">
                  <ImageIcon className="h-4 w-4" />
                  Gallery
                </TabsTrigger>
              </TabsList>
              <span
                className={`text-sm ${
                  isDirty
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-muted-foreground"
                }`}
              >
                {isDirty ? "Unsaved changes" : "No unsaved changes"}
              </span>
            </div>

            <TabsContent value="basics" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="space-y-3 p-4">
                  <InputFormField
                    form={form}
                    name="name"
                    label="Name"
                    placeholder="e.g. Sankofa Adinkra"
                    disabled={isSubmitting}
                  />
                  <InputFormField
                    form={form}
                    name="email"
                    label="Email"
                    placeholder="contact@club.example.org"
                    disabled={isSubmitting}
                    type="email"
                    description="Used for communication with club members."
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputFormField
                      form={form}
                      name="slug"
                      label="Slug"
                      placeholder="e.g. sankofa-adinkra"
                      disabled={isSubmitting}
                      className="col-span-1"
                    />

                    <SelectFormField
                      form={form}
                      name="type"
                      label="Type"
                      values={CLUB_TYPES.map((t) => ({
                        value: t,
                        label: t
                          .split("_")
                          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                          .join(" "),
                      }))}
                      disabled={isSubmitting}
                      className="col-span-1"
                    />
                  </div>
                  <InputFormField
                    form={form}
                    name="tagline"
                    label="Tagline (optional)"
                    placeholder="e.g. Growing together, one plant at a time"
                    disabled={isSubmitting}
                  />

                  <TextareaFormField
                    form={form}
                    name="quickDescription"
                    label="Quick description (optional)"
                    placeholder="Short summary for cards and listings"
                    disabled={isSubmitting}
                  />
                  <TextareaFormField
                    form={form}
                    name="description"
                    label="Description (optional)"
                    placeholder="e.g. Collection of Sankofa Adinkra designs and symbols"
                    disabled={isSubmitting}
                    rows={10}
                  />
                </Card>
                <div className="space-y-3 p-4">
                  {/* {session?.user.role === "ADMIN" && ( */}
                  <Card className="p-4">
                    <SwitchFormField
                      form={form}
                      name="isFeatured"
                      label="Featured"
                      disabled={isSubmitting}
                      description="Admin use only. Gives this club more visibility on the Community and Home pages."
                    />
                  </Card>
                  {/* )} */}

                  <Card className="space-y-3 p-4">
                    <ImageUploadFormField
                      form={form}
                      name="logoFile"
                      label="Logo"
                      description="Submitted on save."
                      disabled={isSubmitting}
                      existingPreviewUrl={defaultValues.logo ?? undefined}
                      inputRef={logoFileInputRef}
                    />
                    <ImageUploadFormField
                      form={form}
                      name="imageFile"
                      label="Cover image"
                      description="Submitted on save."
                      disabled={isSubmitting}
                      existingPreviewUrl={defaultValues.image ?? undefined}
                      inputRef={imageFileInputRef}
                    />
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Leaders</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() =>
                        leadersField.append({
                          name: "",
                          role: "MEMBER",
                          image: undefined,
                          imageFile: null,
                        })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add leader
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {leadersField.fields.map((field, i) => (
                      <div
                        key={field.id}
                        className="border-border space-y-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <InputFormField
                              form={form}
                              name={`leaders.${i}.name`}
                              label="Name"
                              placeholder="Full name"
                              disabled={isSubmitting}
                              className="col-span-1 flex-1"
                            />
                            <SelectFormField
                              form={form}
                              name={`leaders.${i}.role`}
                              label="Role"
                              values={LEADER_ROLES.map((r) => ({
                                value: r,
                                label: r
                                  .replace(/_/g, " ")
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c) => c.toUpperCase()),
                              }))}
                              className="col-span-1"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => leadersField.remove(i)}
                            className="text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <ImageUploadFormField
                              form={form}
                              name={`leaders.${i}.imageFile`}
                              label="Photo"
                              description="Upload a photo. Submitted on save."
                              disabled={isSubmitting}
                              existingPreviewUrl={
                                form.watch(`leaders.${i}.image`) ?? undefined
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Resources</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() =>
                        resourcesField.append({
                          url: "",
                          name: "",
                          type: undefined,
                          file: null,
                          useUrl: false, // Default to file upload mode for new resources
                        })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add resource
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {resourcesField.fields.map((field, i) => (
                      <div
                        key={field.id}
                        className="border-border space-y-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <InputFormField
                            form={form}
                            name={`resources.${i}.name`}
                            label="Name"
                            placeholder="Display name"
                            disabled={isSubmitting}
                            className="min-w-[120px] flex-1"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => resourcesField.remove(i)}
                            className="text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={`resources.${i}.useUrl`}
                            render={({ field: useUrlField }) => (
                              <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-medium">
                                    Resource type
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    Choose how to provide this resource
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={
                                      !useUrlField.value ? "default" : "outline"
                                    }
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                      useUrlField.onChange(false);
                                      form.setValue(`resources.${i}.url`, "");
                                      form.setValue(
                                        `resources.${i}.file`,
                                        null,
                                      );
                                    }}
                                  >
                                    Upload file
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      useUrlField.value ? "default" : "outline"
                                    }
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                      useUrlField.onChange(true);
                                      form.setValue(
                                        `resources.${i}.file`,
                                        null,
                                      );
                                    }}
                                  >
                                    Enter URL
                                  </Button>
                                </div>
                              </div>
                            )}
                          />
                          {form.watch(`resources.${i}.useUrl`) ? (
                            <InputFormField
                              form={form}
                              name={`resources.${i}.url`}
                              label="Resource URL"
                              placeholder="https://example.org/resource or https://example.org/file.pdf"
                              disabled={isSubmitting}
                              className="w-full"
                            />
                          ) : (
                            <FileUploadFormField
                              form={form}
                              name={`resources.${i}.file`}
                              label="Upload file"
                              description="Upload PDF, DOC, DOCX, or image. Submitted on save."
                              disabled={isSubmitting}
                              existingPreviewUrl={
                                form.watch(`resources.${i}.url`) ?? undefined
                              }
                              fileTypes="all"
                              className="w-full"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Highlights</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => highlightsField.append("")}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add highlight
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {highlightsField.fields.map((field, i) => (
                      <div
                        key={field.id}
                        className="border-border flex items-center gap-2 rounded-lg border p-2"
                      >
                        <GripVertical className="text-muted-foreground h-4 w-4 shrink-0" />
                        <InputFormField
                          form={form}
                          name={`highlights.${i}`}
                          label=""
                          placeholder="e.g. Monthly block clean-ups"
                          disabled={isSubmitting}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => highlightsField.remove(i)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="mt-4">
              <Card className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Gallery images</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() =>
                      galleryField.append({ url: "", alt: "", file: null })
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add image
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {galleryField.fields.map((field, i) => (
                    <div
                      key={field.id}
                      className="border-border flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <ImageUploadFormField
                            form={form}
                            name={`gallery.${i}.file`}
                            label="Image"
                            description="Submitted on save."
                            disabled={isSubmitting}
                            existingPreviewUrl={
                              form.watch(`gallery.${i}.url`) ?? undefined
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => galleryField.remove(i)}
                          className="text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <InputFormField
                        form={form}
                        name={`gallery.${i}.alt`}
                        label="Alt text"
                        placeholder="Describe the image"
                        disabled={isSubmitting}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete club</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{defaultValues.name}&quot;?
              This action cannot be undone. The club must have no pages,
              announcements, events, or members.
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
