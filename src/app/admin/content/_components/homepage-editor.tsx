"use client";

import { Fragment, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { HomepageFormSchema } from "~/lib/validators/homepage";
import { env } from "~/env";
import { homepageFormSchema } from "~/lib/validators/homepage";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

// type Feature = {
//   title: string;
//   description: string;
//   icon: string;
// };

// type SocialLinks = {
//   instagram?: string;
//   facebook?: string;
//   twitter?: string;
//   linkedin?: string;
// };

type HomepageEditorProps = {
  business: {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
  };
  siteContent: {
    id: string;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    heroButtonText: string | null;
    heroButtonLink: string | null;
    aboutTitle: string | null;
    aboutText: string | null;
    aboutImageUrl: string | null;
    features: unknown;
    footerText: string | null;
    socialLinks: unknown;
  };
};

export function HomepageEditor({ business, siteContent }: HomepageEditorProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const heroImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const aboutImageFileInputRef = useRef<HTMLInputElement | null>(null);

  // const [isSaving, setIsSaving] = useState(false);

  // // Hero section
  // const [heroTitle, setHeroTitle] = useState(siteContent.heroTitle ?? "");
  // const [heroSubtitle, setHeroSubtitle] = useState(
  //   siteContent.heroSubtitle ?? "",
  // );
  // const [heroImageUrl, setHeroImageUrl] = useState(
  //   siteContent.heroImageUrl ?? "",
  // );
  // const [heroButtonText, setHeroButtonText] = useState(
  //   siteContent.heroButtonText ?? "",
  // );
  // const [heroButtonLink, setHeroButtonLink] = useState(
  //   siteContent.heroButtonLink ?? "",
  // );

  // // About section
  // const [aboutTitle, setAboutTitle] = useState(siteContent.aboutTitle ?? "");
  // const [aboutText, setAboutText] = useState(siteContent.aboutText ?? "");
  // const [aboutImageUrl, setAboutImageUrl] = useState(
  //   siteContent.aboutImageUrl ?? "",
  // );

  // // Features
  // const [features, setFeatures] = useState<Feature[]>(
  //   siteContent.features ? (siteContent.features as Feature[]) : [],
  // );

  // // Footer
  // const [footerText, setFooterText] = useState(siteContent.footerText ?? "");
  // const [socialLinks, setSocialLinks] = useState<SocialLinks>(
  //   siteContent.socialLinks ? (siteContent.socialLinks as SocialLinks) : {},
  // );

  const socialLinks = (siteContent.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        linkedin?: string;
      }
    | undefined) ?? {
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
  };

  const form = useForm<HomepageFormSchema>({
    resolver: zodResolver(homepageFormSchema),
    defaultValues: {
      heroTitle: siteContent.heroTitle ?? "",
      heroSubtitle: siteContent.heroSubtitle ?? "",
      heroImageUrl: siteContent.heroImageUrl ?? "",
      heroButtonText: siteContent.heroButtonText ?? "",
      heroButtonLink: siteContent.heroButtonLink ?? "",
      aboutTitle: siteContent.aboutTitle ?? "",
      aboutText: siteContent.aboutText ?? "",
      aboutImageUrl: siteContent.aboutImageUrl ?? "",
      features:
        (
          siteContent.features as
            | {
                title: string;
                description: string;
                icon: string;
              }[]
            | undefined
        )?.map((feature) => ({
          title: feature.title ?? "",
          description: feature.description ?? "",
          icon: feature.icon ?? "",
        })) ?? [],
      footerText: siteContent.footerText ?? "",
      socialLinks: {
        instagram: socialLinks.instagram ?? "",
        facebook: socialLinks.facebook ?? "",
        twitter: socialLinks.twitter ?? "",
        linkedin: socialLinks.linkedin ?? "",
      },
      heroImageFile: null,
      aboutImageFile: null,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "features",
  });

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Homepage updated successfully");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update homepage");
    },
    onMutate: () => {
      toast.loading("Updating homepage...");
    },
    onSettled: () => {
      router.refresh();
    },
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  const onSubmit = async (data: HomepageFormSchema) => {
    let heroImageUrl: string | undefined = data.heroImageUrl ?? undefined;
    let aboutImageUrl: string | undefined = data.aboutImageUrl ?? undefined;

    const heroImageFile = data.heroImageFile;
    if (heroImageFile instanceof File) {
      try {
        const response = await imageUploader.upload(heroImageFile);

        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";

        if (fileLocation) heroImageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload hero image.");
        return;
      }
    }

    const aboutImageFile = data.aboutImageFile;
    if (aboutImageFile instanceof File) {
      try {
        const response = await imageUploader.upload(aboutImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) aboutImageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload about image.");
        return;
      }
    }
    updateSiteContent.mutate({
      businessId: business.id,
      data: {
        heroTitle: data.heroTitle ?? "",
        heroSubtitle: data.heroSubtitle ?? "",
        heroImageUrl,
        heroButtonText: data.heroButtonText ?? "",
        heroButtonLink: data.heroButtonLink ?? "",
        aboutTitle: data.aboutTitle ?? "",
        aboutText: data.aboutText ?? "",
        aboutImageUrl,
        features: data.features ?? [],
        footerText: data.footerText ?? "",
        socialLinks: data.socialLinks ?? {},
      },
    });
  };

  // const addFeature = () => {
  //   setFeatures([...features, { title: "", description: "", icon: "star" }]);
  // };

  // const updateFeature = (
  //   index: number,
  //   field: keyof Feature,
  //   value: string,
  // ) => {
  //   const updated = [...features];
  //   updated[index]![field] = value;
  //   setFeatures(updated);
  // };

  // const deleteFeature = (index: number) => {
  //   setFeatures(features.filter((_, i) => i !== index));
  // };

  const storefrontUrl = business.customDomain
    ? `https://${business.customDomain}`
    : `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

  const isSubmitting = updateSiteContent.isPending || imageUploader.isPending;
  const isUploading = imageUploader.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-6"
        >
          <div className="admin-form-header">
            <div className={`${isDirty ? "isDirty" : "isNotDirty"}`}>
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                  <Link href="/admin/content">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>

                <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />

                <div className="hidden min-w-0 items-center gap-2 sm:flex">
                  <h1>Edit Homepage</h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" asChild>
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || !isDirty}
                  onClick={() => form.reset()}
                  className="hidden md:inline-flex"
                >
                  Reset
                </Button>

                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                      {isUploading ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Save homepage</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Header */}
          {/* <div className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/content">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Homepage Editor
                </h1>
                <p className="mt-2 text-gray-600">
                  Customize your homepage content and sections
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" asChild>
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div> */}

          {/* Content Tabs */}
          <Tabs defaultValue="hero" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="hero">Hero Section</TabsTrigger>
              <TabsTrigger value="about">About Section</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="footer">Footer</TabsTrigger>
            </TabsList>

            {/* Hero Section */}
            <TabsContent value="hero">
              <Card>
                <CardHeader>
                  <CardTitle>Hero Section</CardTitle>
                  <CardDescription>
                    The main banner at the top of your homepage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <InputFormField
                    form={form}
                    name="heroTitle"
                    label="Title"
                    placeholder="Welcome to our store"
                  />
                  <TextareaFormField
                    form={form}
                    name="heroSubtitle"
                    label="Subtitle"
                    placeholder="Discover amazing products..."
                    rows={3}
                  />

                  <ImageUploadFormField
                    form={form}
                    name="heroImageFile"
                    label="Hero image"
                    disabled={isSubmitting}
                    existingPreviewUrl={siteContent.heroImageUrl ?? undefined}
                    inputRef={heroImageFileInputRef}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <InputFormField
                      form={form}
                      name="heroButtonText"
                      label="Button Text"
                      placeholder="Shop Now"
                      className="col-span-1"
                    />
                    <InputFormField
                      form={form}
                      name="heroButtonLink"
                      label="Button Link"
                      placeholder="/products"
                      className="col-span-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Section */}
            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>About Section</CardTitle>
                  <CardDescription>
                    Tell your story and what makes you unique
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <InputFormField
                    form={form}
                    name="aboutTitle"
                    label="Title"
                    placeholder="About Us"
                  />

                  <TextareaFormField
                    form={form}
                    name="aboutText"
                    label="Text"
                    placeholder="Tell your story..."
                    rows={6}
                  />

                  <ImageUploadFormField
                    form={form}
                    name="aboutImageFile"
                    label="About image"
                    disabled={isSubmitting}
                    existingPreviewUrl={siteContent.aboutImageUrl ?? undefined}
                    inputRef={aboutImageFileInputRef}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features */}
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Features</CardTitle>
                      <CardDescription>
                        Highlight your key features and benefits
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={() =>
                        append({ title: "", description: "", icon: "star" })
                      }
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Feature
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <p>
                        No features yet. Click &quot;Add Feature&quot; to get
                        started.
                      </p>
                    </div>
                  ) : (
                    fields.map((feature, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="mb-4 flex items-start justify-between">
                            <Badge variant="outline">Feature {index + 1}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label>Icon</Label>
                              <Input
                                {...form.register(`features.${index}.icon`)}
                                onChange={(e) =>
                                  update(index, {
                                    ...feature,
                                    icon: e.target.value,
                                  })
                                }
                                placeholder="star"
                                className="mt-2"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Lucide icon name (e.g., star, check, heart)
                              </p>
                            </div>

                            <div>
                              <Label>Title</Label>
                              <Input
                                {...form.register(`features.${index}.title`)}
                                onChange={(e) =>
                                  update(index, {
                                    ...feature,
                                    title: e.target.value,
                                  })
                                }
                                placeholder="Free Shipping"
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <Label>Description</Label>
                              <Textarea
                                {...form.register(
                                  `features.${index}.description`,
                                )}
                                onChange={(e) =>
                                  update(index, {
                                    ...feature,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="On all orders over $50"
                                rows={2}
                                className="mt-2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Footer */}
            <TabsContent value="footer">
              <Card>
                <CardHeader>
                  <CardTitle>Footer</CardTitle>
                  <CardDescription>
                    Footer text and social media links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TextareaFormField
                    form={form}
                    name="footerText"
                    label="Footer Text"
                    placeholder="© 2024 Your Store. All rights reserved."
                    rows={3}
                  />

                  <div>
                    <Label className="mb-4 block">Social Links</Label>
                    <div className="space-y-3">
                      <InputFormField
                        form={form}
                        name="socialLinks.instagram"
                        label="Instagram"
                        placeholder="https://instagram.com/yourstore"
                      />
                      <InputFormField
                        form={form}
                        name="socialLinks.facebook"
                        label="Facebook"
                        placeholder="https://facebook.com/yourstore"
                      />
                      <InputFormField
                        form={form}
                        name="socialLinks.twitter"
                        label="Twitter / X"
                        placeholder="https://twitter.com/yourstore"
                      />
                      <InputFormField
                        form={form}
                        name="socialLinks.linkedin"
                        label="LinkedIn"
                        placeholder="https://linkedin.com/company/yourstore"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button (Fixed Bottom) */}
          {/* <div className="sticky bottom-0 -mx-4 mt-8 border-t bg-white px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/admin/content">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div> */}
        </form>
      </Form>
    </>
  );
}
