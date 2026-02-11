"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
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
import { Textarea } from "~/components/ui/textarea";

type SEOEditorProps = {
  business: { id: string };
  siteContent: {
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    ogImage: string | null;
    faviconUrl: string | null;
  };
};

export function SEOEditor({ business, siteContent }: SEOEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [metaTitle, setMetaTitle] = useState(siteContent.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    siteContent.metaDescription ?? "",
  );
  const [metaKeywords, setMetaKeywords] = useState(
    siteContent.metaKeywords ?? "",
  );
  const [ogImage, setOgImage] = useState(siteContent.ogImage ?? "");
  const [faviconUrl, setFaviconUrl] = useState(siteContent.faviconUrl ?? "");

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.success("SEO settings updated");
      router.refresh();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update SEO settings");
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    updateSiteContent.mutate({
      businessId: business.id,
      data: {
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage: ogImage || undefined,
        faviconUrl: faviconUrl || undefined,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-gray-900">SEO & Meta</h1>
              <p className="mt-2 text-gray-600">
                Optimize your site for search engines
              </p>
            </div>
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

        <div className="space-y-6">
          {/* Meta Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Meta Tags</CardTitle>
              <CardDescription>
                Default meta tags for your site (can be overridden per page)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Your Store - Quality Products"
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {metaTitle.length}/60 characters (optimal: 50-60)
                </p>
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Discover our amazing collection of products..."
                  rows={3}
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {metaDescription.length}/160 characters (optimal: 150-160)
                </p>
              </div>

              <div>
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="ecommerce, products, shopping"
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Comma-separated keywords
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>
                How your site appears when shared on social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="ogImage">Open Graph Image</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="ogImage"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://example.com/og-image.jpg"
                  />
                  <Button variant="outline">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: 1200x630px
                </p>
                {ogImage && (
                  <div className="mt-4">
                    <img
                      src={ogImage}
                      alt="OG Image preview"
                      className="max-h-48 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Favicon */}
          <Card>
            <CardHeader>
              <CardTitle>Favicon</CardTitle>
              <CardDescription>
                The small icon shown in browser tabs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="faviconUrl"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                  <Button variant="outline">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: 32x32px or 16x16px .ico or .png
                </p>
                {faviconUrl && (
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      src={faviconUrl}
                      alt="Favicon preview"
                      className="h-8 w-8"
                    />
                    <span className="text-sm text-gray-600">Preview</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
