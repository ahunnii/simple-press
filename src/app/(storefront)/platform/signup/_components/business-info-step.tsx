"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Check, X } from "lucide-react";

import type { SignupFormData } from "../page";
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
  const [businessName, setBusinessName] = useState(formData.businessName ?? "");
  const [subdomain, setSubdomain] = useState(formData.subdomain ?? "");
  const [customDomain, setCustomDomain] = useState(formData.customDomain ?? "");
  const [error, setError] = useState<string | null>(null);
  const [subdomainStatus, setSubdomainStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  // Auto-generate subdomain from business name
  useEffect(() => {
    if (businessName && !subdomain) {
      const generated = slugify(businessName);
      setSubdomain(generated);
    }
  }, [businessName, subdomain]);

  // Check subdomain availability
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainStatus("idle");
      return;
    }

    // Check if reserved
    if (isSubdomainReserved(subdomain)) {
      setSubdomainStatus("taken");
      return;
    }

    const checkAvailability = async () => {
      setSubdomainStatus("checking");

      try {
        const response = await fetch(
          `/api/signup/check-subdomain?subdomain=${subdomain}`,
        );
        const data = (await response.json()) as { available: boolean };

        setSubdomainStatus(data.available ? "available" : "taken");
      } catch (err) {
        setSubdomainStatus("idle");
      }
    };

    const debounce = setTimeout(() => void checkAvailability(), 500);
    return () => clearTimeout(debounce);
  }, [subdomain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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

    // Validation passed
    onNext({
      businessName,
      subdomain,
      customDomain: customDomain || undefined,
    });
  };

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
                onChange={(e) => setSubdomain(slugify(e.target.value))}
                placeholder="mystore"
                required
                className="flex-1"
              />
              <span className="text-sm whitespace-nowrap text-gray-500">
                .myapplication.com
              </span>
            </div>

            {/* Subdomain status indicator */}
            {subdomain && subdomain.length >= 3 && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {subdomainStatus === "checking" && (
                  <span className="text-gray-500">
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

            <p className="mt-2 text-sm text-gray-500">
              Your store will be available at:{" "}
              <strong>{subdomain || "yourstore"}.myapplication.com</strong>
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
              disabled={subdomainStatus !== "available"}
            >
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
