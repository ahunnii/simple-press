"use client";

import type { Business, SiteContent } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  XCircle,
} from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
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

// type Business = {
//   id: string;
//   subdomain: string;
//   customDomain: string | null;
//   domainStatus: string;
// };

type DomainSettingsProps = {
  business: Business & { siteContent?: SiteContent | null };
};

export function DomainSettings({ business }: DomainSettingsProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState("");

  const isDev = process.env.NODE_ENV === "development";
  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "myapplication.com";
  const subdomainUrl = isDev
    ? `http://${business.subdomain}.localhost:3000`
    : `https://${business.subdomain}.${platformDomain}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "pending_dns":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending DNS
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not Configured
          </Badge>
        );
    }
  };

  const addDomainMutation = api.domain.add.useMutation({
    onSuccess: () => {
      router.refresh();
      setSuccess("Domain added! Configure DNS and verify below.");
      setCustomDomain("");
    },
    onError: (error) => {
      setError(error.message ?? "Failed to add domain");
    },
    onSettled: () => {
      setIsAdding(false);
    },
  });

  const verifyDomainMutation = api.domain.verify.useMutation({
    onSuccess: () => {
      router.refresh();
      setSuccess("Domain verified successfully!");
    },
    onError: (error) => {
      setError(error.message ?? "Failed to verify domain");
    },
    onSettled: () => {
      setIsVerifying(false);
    },
  });

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsAdding(true);

    // try {
    if (!customDomain.trim()) {
      throw new Error("Please enter a domain");
    }

    addDomainMutation.mutate(customDomain.trim().toLowerCase());

    //   if (!response.ok) {
    //     const data = await response.json();
    //     throw new Error(data.error || "Failed to add domain");
    //   }

    //   setSuccess("Domain added! Configure DNS and verify below.");
    //   setCustomDomain("");
    //   router.refresh();
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setIsAdding(false);
    // }
  };

  const handleVerifyDomain = async () => {
    setError(null);
    setSuccess(null);
    setIsVerifying(true);

    if (!business.customDomain) {
      throw new Error("No custom domain found");
    }
    verifyDomainMutation.mutate(business.customDomain);
    // try {
    //   const response = await fetch("/api/domain/verify", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       businessId: business.id,
    //     }),
    //   });

    //   if (!response.ok) {
    //     const data = await response.json();
    //     throw new Error(data.error || "Failed to verify domain");
    //   }

    //   const data = await response.json();

    //   if (data.verified) {
    //     setSuccess("Domain verified successfully!");
    //     router.refresh();
    //   } else {
    //     setError("Domain not verified yet. Please check your DNS settings.");
    //   }
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setIsVerifying(false);
    // }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Default Subdomain */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Default Subdomain</CardTitle>
              <CardDescription>Your store&apos;s default URL</CardDescription>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={subdomainUrl}
              disabled
              className="bg-gray-50 font-mono"
            />
            <Button variant="outline" size="sm" asChild>
              <a href={subdomainUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            This is your permanent store URL. It cannot be changed.
          </p>
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Domain</CardTitle>
              <CardDescription>Use your own domain name</CardDescription>
            </div>
            {business.customDomain && getStatusBadge(business.domainStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {business.customDomain ? (
            <>
              <div>
                <Label>Domain</Label>
                <Input
                  value={business.customDomain}
                  disabled
                  className="bg-gray-50 font-mono"
                />
              </div>

              {business.domainStatus === "PENDING_DNS" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-2 font-semibold text-amber-900">
                    DNS Configuration Required
                  </h4>
                  <p className="mb-3 text-sm text-amber-800">
                    Add these DNS records to your domain registrar:
                  </p>
                  <div className="space-y-1 rounded border bg-white p-3 font-mono text-sm">
                    <div>Type: A</div>
                    <div>Name: @</div>
                    <div>
                      Value: {process.env.NEXT_PUBLIC_VPS_IP ?? "YOUR_VPS_IP"}
                    </div>
                    <div className="mt-2 border-t pt-2">Type: A</div>
                    <div>Name: www</div>
                    <div>
                      Value: {process.env.NEXT_PUBLIC_VPS_IP ?? "YOUR_VPS_IP"}
                    </div>
                  </div>
                  <Button
                    onClick={handleVerifyDomain}
                    disabled={isVerifying}
                    className="mt-4"
                    size="sm"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify DNS"
                    )}
                  </Button>
                </div>
              )}

              {business.domainStatus === "ACTIVE" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your custom domain is active and working!
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <form onSubmit={handleAddDomain}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customDomain">Domain Name</Label>
                  <Input
                    id="customDomain"
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="example.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter your domain without &quot;http://&quot; or
                    &quot;www&quot;
                  </p>
                </div>

                <Button type="submit" disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Add Custom Domain
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
