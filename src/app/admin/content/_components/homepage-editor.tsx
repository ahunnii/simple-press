/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/content/homepage/_components/homepage-editor.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";

type Feature = {
  title: string;
  description: string;
  icon: string;
};

type SocialLinks = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
};

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
    features: any;
    footerText: string | null;
    socialLinks: any;
  };
};

export function HomepageEditor({ business, siteContent }: HomepageEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Hero section
  const [heroTitle, setHeroTitle] = useState(siteContent.heroTitle ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(
    siteContent.heroSubtitle ?? "",
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    siteContent.heroImageUrl ?? "",
  );
  const [heroButtonText, setHeroButtonText] = useState(
    siteContent.heroButtonText ?? "",
  );
  const [heroButtonLink, setHeroButtonLink] = useState(
    siteContent.heroButtonLink ?? "",
  );

  // About section
  const [aboutTitle, setAboutTitle] = useState(siteContent.aboutTitle ?? "");
  const [aboutText, setAboutText] = useState(siteContent.aboutText ?? "");
  const [aboutImageUrl, setAboutImageUrl] = useState(
    siteContent.aboutImageUrl ?? "",
  );

  // Features
  const [features, setFeatures] = useState<Feature[]>(
    siteContent.features ? (siteContent.features as Feature[]) : [],
  );

  // Footer
  const [footerText, setFooterText] = useState(siteContent.footerText ?? "");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(
    siteContent.socialLinks ? (siteContent.socialLinks as SocialLinks) : {},
  );

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.success("Homepage updated successfully");
      router.refresh();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update homepage");
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    updateSiteContent.mutate({
      businessId: business.id,
      data: {
        heroTitle,
        heroSubtitle,
        heroImageUrl: heroImageUrl || undefined,
        heroButtonText,
        heroButtonLink,
        aboutTitle,
        aboutText,
        aboutImageUrl: aboutImageUrl || undefined,
        features,
        footerText,
        socialLinks,
      },
    });
  };

  const addFeature = () => {
    setFeatures([...features, { title: "", description: "", icon: "star" }]);
  };

  const updateFeature = (
    index: number,
    field: keyof Feature,
    value: string,
  ) => {
    const updated = [...features];
    updated[index]![field] = value;
    setFeatures(updated);
  };

  const deleteFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const storefrontUrl = business.customDomain
    ? `https://${business.customDomain}`
    : `https://${business.subdomain}.myapplication.com`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
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
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
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
        </div>

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
                <div>
                  <Label htmlFor="heroTitle">Title</Label>
                  <Input
                    id="heroTitle"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Welcome to our store"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="heroSubtitle">Subtitle</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Discover amazing products..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="heroImageUrl">Background Image URL</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="heroImageUrl"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="https://example.com/hero.jpg"
                    />
                    <Button variant="outline">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {heroImageUrl && (
                    <div className="mt-4">
                      <img
                        src={heroImageUrl}
                        alt="Hero preview"
                        className="max-h-48 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="heroButtonText">Button Text</Label>
                    <Input
                      id="heroButtonText"
                      value={heroButtonText}
                      onChange={(e) => setHeroButtonText(e.target.value)}
                      placeholder="Shop Now"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="heroButtonLink">Button Link</Label>
                    <Input
                      id="heroButtonLink"
                      value={heroButtonLink}
                      onChange={(e) => setHeroButtonLink(e.target.value)}
                      placeholder="/products"
                      className="mt-2"
                    />
                  </div>
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
                <div>
                  <Label htmlFor="aboutTitle">Title</Label>
                  <Input
                    id="aboutTitle"
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    placeholder="About Us"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="aboutText">Description</Label>
                  <Textarea
                    id="aboutText"
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="Tell your story..."
                    rows={6}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="aboutImageUrl">Image URL</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="aboutImageUrl"
                      value={aboutImageUrl}
                      onChange={(e) => setAboutImageUrl(e.target.value)}
                      placeholder="https://example.com/about.jpg"
                    />
                    <Button variant="outline">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {aboutImageUrl && (
                    <div className="mt-4">
                      <img
                        src={aboutImageUrl}
                        alt="About preview"
                        className="max-h-48 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
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
                  <Button onClick={addFeature} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <p>
                      No features yet. Click &quot;Add Feature&quot; to get
                      started.
                    </p>
                  </div>
                ) : (
                  features.map((feature, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="mb-4 flex items-start justify-between">
                          <Badge variant="outline">Feature {index + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFeature(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label>Icon</Label>
                            <Input
                              value={feature.icon}
                              onChange={(e) =>
                                updateFeature(index, "icon", e.target.value)
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
                              value={feature.title}
                              onChange={(e) =>
                                updateFeature(index, "title", e.target.value)
                              }
                              placeholder="Free Shipping"
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={feature.description}
                              onChange={(e) =>
                                updateFeature(
                                  index,
                                  "description",
                                  e.target.value,
                                )
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
                <div>
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="© 2024 Your Store. All rights reserved."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="mb-4 block">Social Links</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="instagram" className="text-sm">
                        Instagram
                      </Label>
                      <Input
                        id="instagram"
                        value={socialLinks.instagram ?? ""}
                        onChange={(e) =>
                          setSocialLinks({
                            ...socialLinks,
                            instagram: e.target.value,
                          })
                        }
                        placeholder="https://instagram.com/yourstore"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="facebook" className="text-sm">
                        Facebook
                      </Label>
                      <Input
                        id="facebook"
                        value={socialLinks.facebook ?? ""}
                        onChange={(e) =>
                          setSocialLinks({
                            ...socialLinks,
                            facebook: e.target.value,
                          })
                        }
                        placeholder="https://facebook.com/yourstore"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="twitter" className="text-sm">
                        Twitter / X
                      </Label>
                      <Input
                        id="twitter"
                        value={socialLinks.twitter ?? ""}
                        onChange={(e) =>
                          setSocialLinks({
                            ...socialLinks,
                            twitter: e.target.value,
                          })
                        }
                        placeholder="https://twitter.com/yourstore"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="linkedin" className="text-sm">
                        LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        value={socialLinks.linkedin ?? ""}
                        onChange={(e) =>
                          setSocialLinks({
                            ...socialLinks,
                            linkedin: e.target.value,
                          })
                        }
                        placeholder="https://linkedin.com/company/yourstore"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button (Fixed Bottom) */}
        <div className="sticky bottom-0 -mx-4 mt-8 border-t bg-white px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/admin/content">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
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
      </div>
    </div>
  );
}
