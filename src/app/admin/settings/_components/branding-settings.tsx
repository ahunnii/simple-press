"use client";

import { Loader2, Palette, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

type Business = {
  id: string;
  templateId: string;
  siteContent: {
    heroTitle: string | null;
    heroSubtitle: string | null;
    aboutText: string | null;
    primaryColor: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    footerText: string | null;
  } | null;
};

type BrandingSettingsProps = {
  business: Business;
};

export function BrandingSettings({ business }: BrandingSettingsProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const siteContent = business.siteContent || {};

  // Form state
  const [templateId, setTemplateId] = useState(business.templateId);
  const [heroTitle, setHeroTitle] = useState(siteContent.heroTitle || "");
  const [heroSubtitle, setHeroSubtitle] = useState(
    siteContent.heroSubtitle || "",
  );
  const [aboutText, setAboutText] = useState(siteContent.aboutText || "");
  const [primaryColor, setPrimaryColor] = useState(
    siteContent.primaryColor || "#3b82f6",
  );
  const [logoUrl, setLogoUrl] = useState(siteContent.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(siteContent.faviconUrl || "");
  const [footerText, setFooterText] = useState(siteContent.footerText || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/business/${business.id}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          siteContent: {
            heroTitle: heroTitle || null,
            heroSubtitle: heroSubtitle || null,
            aboutText: aboutText || null,
            primaryColor,
            logoUrl: logoUrl || null,
            faviconUrl: faviconUrl || null,
            footerText: footerText || null,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update branding");
      }

      setSuccess(true);
      router.refresh();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
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
          <AlertDescription>Branding updated successfully!</AlertDescription>
        </Alert>
      )}

      {/* Template */}
      <Card>
        <CardHeader>
          <CardTitle>Store Template</CardTitle>
          <CardDescription>
            Choose the design template for your storefront
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Colors & Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>
            Logo and color scheme for your store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Main color used for buttons and accents
            </p>
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-1 text-sm text-gray-500">
              URL to your store logo image
            </p>
          </div>

          <div>
            <Label htmlFor="faviconUrl">Favicon URL</Label>
            <Input
              id="faviconUrl"
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://example.com/favicon.ico"
            />
            <p className="mt-1 text-sm text-gray-500">
              Small icon shown in browser tabs (recommended: 32x32px)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Homepage Content */}
      <Card>
        <CardHeader>
          <CardTitle>Homepage Content</CardTitle>
          <CardDescription>
            Hero section and about text for your homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="heroTitle">Hero Title</Label>
            <Input
              id="heroTitle"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Welcome to Our Store"
            />
          </div>

          <div>
            <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
            <Input
              id="heroSubtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Discover amazing products"
            />
          </div>

          <div>
            <Label htmlFor="aboutText">About Section</Label>
            <Textarea
              id="aboutText"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="Tell customers about your business..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
          <CardDescription>Footer text for your store</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="footerText">Footer Text</Label>
            <Textarea
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="© 2024 Your Store. All rights reserved."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

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
