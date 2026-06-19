"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Loader2, X } from "lucide-react";

import type { SignupFormData } from "./wizard-client";
import { env } from "~/env";
import { findFirstAvailableSubdomain } from "~/lib/subdomain";
import { isSubdomainReserved, isValidDomain, slugify } from "~/lib/utils";
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

type BusinessInfoStepProps = {
  formData: Partial<SignupFormData>;
  onNext: (data: Partial<SignupFormData>) => void;
  onBack?: () => void;
};

export function BusinessInfoStep({
  formData,
  onNext,
  onBack,
}: BusinessInfoStepProps) {
  const artisanFlow = Boolean(formData.artisanFlow);
  const [businessName, setBusinessName] = useState(formData.businessName ?? "");
  const [subdomain, setSubdomain] = useState(formData.subdomain ?? "");
  const [customDomain, setCustomDomain] = useState(formData.customDomain ?? "");
  const [error, setError] = useState<string | null>(null);
  const [subdomainStatus, setSubdomainStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >(() => (artisanFlow ? "checking" : "idle"));
  const [artisanSubdomainError, setArtisanSubdomainError] = useState<
    string | null
  >(null);

  // Auto-generate subdomain from business name (regular flow only)
  useEffect(() => {
    if (artisanFlow) return;
    if (businessName && !subdomain) {
      const generated = slugify(businessName);
      setSubdomain(generated);
    }
  }, [artisanFlow, businessName, subdomain]);

  // Artisan: pick first available subdomain from locked business name
  useEffect(() => {
    if (!artisanFlow || !formData.businessName) return;

    let cancelled = false;
    setSubdomainStatus("checking");
    setArtisanSubdomainError(null);

    void findFirstAvailableSubdomain(formData.businessName)
      .then((resolved) => {
        if (cancelled) return;
        setSubdomain(resolved);
        setSubdomainStatus("available");
      })
      .catch((err: unknown) => {
        console.error(err);
        if (cancelled) return;
        setArtisanSubdomainError(
          "Could not reserve a subdomain. Please try again or contact support.",
        );
        setSubdomainStatus("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [artisanFlow, formData.businessName]);

  // Check subdomain availability (regular flow only — artisan uses findFirstAvailableSubdomain)
  useEffect(() => {
    if (artisanFlow) return;

    if (!subdomain || subdomain.length < 3) {
      setSubdomainStatus("idle");
      return;
    }

    if (isSubdomainReserved(subdomain)) {
      setSubdomainStatus("taken");
      return;
    }

    const checkAvailability = async () => {
      setSubdomainStatus("checking");

      try {
        const response = await fetch(
          `/api/signup/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`,
        );
        const data = (await response.json()) as { available: boolean };

        setSubdomainStatus(data.available ? "available" : "taken");
      } catch (err) {
        console.error(err);
        setSubdomainStatus("idle");
      }
    };

    const debounce = setTimeout(() => void checkAvailability(), 500);
    return () => clearTimeout(debounce);
  }, [subdomain, artisanFlow]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError("Please enter your business name");
      return;
    }

    if (!subdomain || subdomain.length < 3) {
      setError("Subdomain must be at least 3 characters");
      return;
    }

    if (subdomainStatus !== "available") {
      setError("Please choose an available subdomain");
      return;
    }

    if (customDomain && !isValidDomain(customDomain)) {
      setError("Please enter a valid domain (e.g., example.com)");
      return;
    }

    onNext({
      businessName,
      subdomain,
      customDomain: customDomain || undefined,
    });
  };

  const continueDisabled =
    artisanSubdomainError !== null || subdomainStatus !== "available";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about your business</CardTitle>
        <CardDescription>
          This information will be used to set up your store
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
          {artisanSubdomainError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{artisanSubdomainError}</AlertDescription>
            </Alert>
          )}

          <div>
            <label
              htmlFor="businessName"
              className="mb-2 block text-sm font-medium"
            >
              Business Name
            </label>
            <Input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="My Awesome Store"
              required
              autoFocus
              readOnly={artisanFlow}
              className={artisanFlow ? "bg-muted" : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="subdomain"
              className="mb-2 block text-sm font-medium"
            >
              Choose your subdomain
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                type="text"
                value={subdomain}
                onChange={(e) =>
                  setSubdomain(
                    artisanFlow ? subdomain : slugify(e.target.value),
                  )
                }
                placeholder="mystore"
                required
                readOnly={artisanFlow}
                className={`flex-1${artisanFlow ? "bg-muted" : ""}`}
              />
              <span className="text-sm whitespace-nowrap text-gray-500">
                .{env.NEXT_PUBLIC_PLATFORM_DOMAIN}
              </span>
            </div>

            {artisanFlow && subdomainStatus === "checking" && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reserving your subdomain...
              </div>
            )}

            {!artisanFlow && subdomain && subdomain.length >= 3 && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {subdomainStatus === "checking" && (
                  <span className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking availability...
                  </span>
                )}
                {subdomainStatus === "available" && (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Available!</span>
                  </>
                )}
                {subdomainStatus === "taken" && (
                  <>
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Not available</span>
                  </>
                )}
              </div>
            )}

            {artisanFlow && subdomain && subdomainStatus === "available" && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Available!</span>
              </div>
            )}

            <p className="mt-2 text-sm text-gray-500">
              Your store will be available at:{" "}
              <strong>
                {subdomain || "yourstore"}.{env.NEXT_PUBLIC_PLATFORM_DOMAIN}
              </strong>
            </p>
          </div>

          <div>
            <label
              htmlFor="customDomain"
              className="mb-2 block text-sm font-medium"
            >
              Custom Domain (Optional)
            </label>
            <Input
              id="customDomain"
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
              placeholder="example.com"
            />
            <p className="mt-2 text-sm text-gray-500">
              You can add this later if you don&apos;t have a domain yet
            </p>
          </div>

          <div className="flex gap-3">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={continueDisabled}
            >
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
