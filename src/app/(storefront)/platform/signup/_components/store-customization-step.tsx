"use client";

import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";
import { authClient } from "~/server/better-auth/client";
import type { SignupFormData } from "../page";

type StoreCustomizationStepProps = {
  formData: Partial<SignupFormData>;
  onBack?: () => void;
};

export function StoreCustomizationStep({
  formData,
  onBack,
}: StoreCustomizationStepProps) {
  const router = useRouter();
  const [heroTitle, setHeroTitle] = useState(
    formData.heroTitle ?? `Welcome to ${formData.businessName ?? "Our Store"}`,
  );
  const [heroSubtitle, setHeroSubtitle] = useState(formData.heroSubtitle ?? "");
  const [aboutText, setAboutText] = useState(formData.aboutText ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    formData.primaryColor ?? "#3b82f6",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const completeFormData = {
      ...formData,
      heroTitle,
      heroSubtitle,
      aboutText,
      primaryColor,
    };

    try {
      if (!formData.email || !formData.password || !formData.name) {
        setError("Please fill in all account details");
        return;
      }

      const { data: authUser, error } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      console.log(authUser);

      const { data: session } = await authClient.getSession();

      console.log(session);

      if (error) {
        setError(error.message ?? "Failed to create account");
        return;
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeFormData),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to create your store");
        return;
      }

      // Success! Redirect to their new store
      window.location.href = data.redirectUrl ?? "";
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize your store</CardTitle>
        <CardDescription>
          Add some basic information. You can change this anytime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label
              htmlFor="heroTitle"
              className="mb-2 block text-sm font-medium"
            >
              Homepage Title
            </label>
            <Input
              id="heroTitle"
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Welcome to our store"
              autoFocus
            />
            <p className="mt-1 text-sm text-gray-500">
              This will be the main heading on your homepage
            </p>
          </div>

          <div>
            <label
              htmlFor="heroSubtitle"
              className="mb-2 block text-sm font-medium"
            >
              Homepage Subtitle (Optional)
            </label>
            <Input
              id="heroSubtitle"
              type="text"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Quality products for everyone"
            />
          </div>

          <div>
            <label
              htmlFor="aboutText"
              className="mb-2 block text-sm font-medium"
            >
              About Your Business (Optional)
            </label>
            <Textarea
              id="aboutText"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="Tell customers about your business..."
              rows={4}
            />
          </div>

          <div>
            <label
              htmlFor="primaryColor"
              className="mb-2 block text-sm font-medium"
            >
              Brand Color
            </label>
            <div className="flex items-center gap-3">
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
              This color will be used for buttons and accents
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Preview</p>
            <div
              className="rounded-lg p-6 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <h3 className="mb-2 text-2xl font-bold">{heroTitle}</h3>
              {heroSubtitle && (
                <p className="text-sm opacity-90">{heroSubtitle}</p>
              )}
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Don&apos;t worry about making everything perfect. You can add
              images, products, and customize further after your store is
              created.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your store...
                </>
              ) : (
                "Create My Store"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
