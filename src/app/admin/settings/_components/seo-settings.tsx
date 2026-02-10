"use client";

import type { Business, SiteContent } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
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

// type Business = {
//   id: string;
//   siteContent: {
//     metaTitle: string | null;
//     metaDescription: string | null;
//     metaKeywords: string | null;
//     ogImage: string | null;
//   } | null;
// };

type SeoSettingsProps = {
  business: Business & { siteContent?: SiteContent | null };
};

export function SeoSettings({ business }: SeoSettingsProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const siteContent = business?.siteContent ?? null;

  // Form state
  const [metaTitle, setMetaTitle] = useState(siteContent?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    siteContent?.metaDescription ?? "",
  );
  const [metaKeywords, setMetaKeywords] = useState(
    siteContent?.metaKeywords ?? "",
  );
  const [ogImage, setOgImage] = useState(siteContent?.ogImage ?? "");

  const updateSeoMutation = api.business.updateSeo.useMutation({
    onSuccess: () => {
      router.refresh();
      setSuccess(true);
    },
    onError: (error) => {
      setError(error.message ?? "Failed to update SEO settings");
    },
    onSettled: () => {
      setIsSaving(false);
      router.refresh();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    updateSeoMutation.mutate({
      metaTitle: metaTitle ?? undefined,
      metaDescription: metaDescription ?? undefined,
      metaKeywords: metaKeywords ?? undefined,
      ogImage: ogImage ?? undefined,
    });

    // try {
    //   const response = await fetch(`/api/business/${business.id}/seo`, {
    //     method: "PATCH",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       metaTitle: metaTitle || null,
    //       metaDescription: metaDescription || null,
    //       metaKeywords: metaKeywords || null,
    //       ogImage: ogImage || null,
    //     }),
    //   });

    //   if (!response.ok) {
    //     const data = await response.json();
    //     throw new Error(data.error || "Failed to update SEO settings");
    //   }

    //   setSuccess(true);
    //   router.refresh();

    //   setTimeout(() => setSuccess(false), 3000);
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setIsSaving(false);
    // }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>
            SEO settings updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Meta Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Meta Tags</CardTitle>
          <CardDescription>Search engine optimization metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Your Store - Quality Products"
              maxLength={60}
            />
            <p className="mt-1 text-sm text-gray-500">
              {metaTitle.length}/60 characters - Shown in search results
            </p>
          </div>

          <div>
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Discover our amazing selection of products..."
              rows={3}
              maxLength={160}
            />
            <p className="mt-1 text-sm text-gray-500">
              {metaDescription.length}/160 characters - Brief description for
              search engines
            </p>
          </div>

          <div>
            <Label htmlFor="metaKeywords">Meta Keywords</Label>
            <Input
              id="metaKeywords"
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              placeholder="ecommerce, products, shopping"
            />
            <p className="mt-1 text-sm text-gray-500">
              Comma-separated keywords (optional, less important for modern SEO)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle>Social Media</CardTitle>
          <CardDescription>Open Graph image for social sharing</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="ogImage">Open Graph Image URL</Label>
            <Input
              id="ogImage"
              type="url"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              placeholder="https://example.com/og-image.jpg"
            />
            <p className="mt-1 text-sm text-gray-500">
              Image shown when your store is shared on social media
              (recommended: 1200x630px)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {(metaTitle || metaDescription) && (
        <Card>
          <CardHeader>
            <CardTitle>Search Result Preview</CardTitle>
            <CardDescription>
              How your store might appear in Google
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-white p-4">
              <div className="mb-1 text-sm text-blue-600">
                {metaTitle || "Your Store Name"}
              </div>
              <div className="mb-2 text-xs text-green-700">
                https://yourstore.com
              </div>
              <div className="text-sm text-gray-600">
                {metaDescription ||
                  "Your store description will appear here..."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
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
    </form>
  );
}
