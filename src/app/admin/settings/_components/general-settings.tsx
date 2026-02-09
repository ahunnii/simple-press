"use client";

import type { Business, SiteContent } from "generated/prisma";
import { Loader2, Save } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

// type Business = {
//   id: string;
//   name: string;
//   slug: string;
//   ownerEmail: string;
//   supportEmail: string | null;
//   businessAddress: string | null;
//   taxId: string | null;
// };

type GeneralSettingsProps = {
  business: Business & { siteContent?: SiteContent | null };
};

export function GeneralSettings({ business }: GeneralSettingsProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState(business.name);
  const [ownerEmail, setOwnerEmail] = useState(business.ownerEmail);
  const [supportEmail, setSupportEmail] = useState(business.supportEmail ?? "");
  const [businessAddress, setBusinessAddress] = useState(
    business.businessAddress ?? "",
  );
  const [taxId, setTaxId] = useState(business.taxId ?? "");

  const updateGeneralMutation = api.business.updateGeneral.useMutation({
    onSuccess: () => {
      router.refresh();
      setSuccess(true);
    },
    onError: (error) => {
      setError(error.message ?? "Failed to update general settings");
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

    updateGeneralMutation.mutate({
      name,
      ownerEmail,
      supportEmail: supportEmail ?? undefined,
      businessAddress: businessAddress ?? undefined,
      taxId: taxId ?? undefined,
    });

    // try {
    //   const response = await fetch(`/api/business/${business.id}/general`, {
    //     method: "PATCH",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       name,
    //       ownerEmail,
    //       supportEmail: supportEmail || null,
    //       businessAddress: businessAddress || null,
    //       taxId: taxId || null,
    //     }),
    //   });

    //   if (!response.ok) {
    //     const data = await response.json();
    //     throw new Error(data.error || "Failed to update settings");
    //   }

    //   setSuccess(true);
    //   router.refresh();

    //   // Clear success message after 3 seconds
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
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Basic information about your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">Store Slug</Label>
            <Input
              id="slug"
              value={business.slug}
              disabled
              className="bg-gray-50"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your unique store identifier (cannot be changed)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Email addresses for your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ownerEmail">Owner Email *</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Primary contact email for the business owner
            </p>
          </div>

          <div>
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              Customer support email address
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Information</CardTitle>
          <CardDescription>
            Business address and tax information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea
              id="businessAddress"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="123 Main St&#10;New York, NY 10001&#10;United States"
              rows={4}
            />
            <p className="mt-1 text-sm text-gray-500">
              Full business address for legal purposes
            </p>
          </div>

          <div>
            <Label htmlFor="taxId">Tax ID / EIN</Label>
            <Input
              id="taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="12-3456789"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your business tax identification number
            </p>
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
