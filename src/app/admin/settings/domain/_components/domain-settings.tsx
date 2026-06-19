"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
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

type DomainSettingsProps = {
  business: NonNullable<RouterOutputs["business"]["getWith"]>;
  vpsIp: string;
};

export function DomainSettings({ business, vpsIp }: DomainSettingsProps) {
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
      case "ACTIVE":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "PENDING_DNS":
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
    onSuccess: (data) => {
      if (data.verified) {
        router.refresh();
        setSuccess("Domain verified successfully!");
      } else {
        setError(data.message ?? "Domain not yet pointing to our server.");
      }
    },
    onError: (error) => {
      setError(error.message ?? "Failed to verify domain");
    },
    onSettled: () => {
      setIsVerifying(false);
    },
  });

  const removeDomainMutation = api.domain.remove.useMutation({
    onSuccess: () => {
      router.refresh();
      setSuccess("Custom domain removed. Your store is back on its subdomain.");
    },
    onError: (error) => {
      setError(error.message ?? "Failed to remove domain");
    },
  });

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!customDomain.trim()) {
      setError("Please enter a domain");
      return;
    }
    setIsAdding(true);
    addDomainMutation.mutate(customDomain.trim().toLowerCase());
  };

  const handleVerifyDomain = () => {
    setError(null);
    setSuccess(null);
    if (!business.customDomain) return;
    setIsVerifying(true);
    verifyDomainMutation.mutate(business.customDomain);
  };

  return (
    <>
      <div className="admin-form-toolbar">
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Domain Settings</h1>
          </div>
        </div>

        <div className="toolbar-actions"></div>
      </div>
      <div className="admin-container">
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
                  <CardDescription>
                    Your store&apos;s default URL
                  </CardDescription>
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
                  <Link
                    href={subdomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
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
                        <div>Value: {vpsIp}</div>
                        <div className="mt-2 border-t pt-2">Type: A</div>
                        <div>Name: www</div>
                        <div>Value: {vpsIp}</div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          onClick={handleVerifyDomain}
                          disabled={isVerifying}
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
                        <RemoveDomainDialog
                          domain={business.customDomain ?? ""}
                          isPending={removeDomainMutation.isPending}
                          onConfirm={() => removeDomainMutation.mutate()}
                        />
                      </div>
                    </div>
                  )}

                  {business.domainStatus === "ACTIVE" && (
                    <div className="space-y-3">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Your custom domain is active and working!
                        </AlertDescription>
                      </Alert>
                      <RemoveDomainDialog
                        domain={business.customDomain ?? ""}
                        isPending={removeDomainMutation.isPending}
                        onConfirm={() => removeDomainMutation.mutate()}
                      />
                    </div>
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
      </div>
    </>
  );
}

function RemoveDomainDialog({
  domain,
  isPending,
  onConfirm,
}: {
  domain: string;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Remove Domain
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Custom Domain?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove <strong>{domain}</strong> from your store. Your
            store will fall back to its permanent subdomain immediately. The
            platform team will be notified to remove the domain from the server.
            <br />
            <br />
            You can add a new custom domain at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Remove Domain
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
