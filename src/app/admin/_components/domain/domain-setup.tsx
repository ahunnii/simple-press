"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Loader2, X } from "lucide-react";

import { env } from "~/env";
import { isValidDomain } from "~/lib/utils";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

type Business = {
  id: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string;
};

type DomainSetupProps = {
  business: Business;
};

export function DomainSetup({ business }: DomainSetupProps) {
  const [isEditing, setIsEditing] = useState(!business.customDomain);
  const [domain, setDomain] = useState(business.customDomain ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subdomainUrl = `${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
  const vpsIp = process.env.NEXT_PUBLIC_VPS_IP ?? "YOUR_VPS_IP";

  const handleSubmit = async () => {
    setError(null);

    if (!isValidDomain(domain)) {
      setError("Please enter a valid domain (e.g., example.com)");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/domain/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to add domain");
      }

      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/domain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: business.customDomain }),
      });

      const data = (await response.json()) as {
        error?: string;
        verified?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to verify domain");
      }

      if (data.verified) {
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        setError(
          "DNS not configured correctly yet. Please wait a few minutes and try again.",
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify domain");
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  // Already has active custom domain
  if (business.customDomain && business.domainStatus === "active") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-600">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Domain Active</span>
        </div>
        <a
          href={`https://${business.customDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          {business.customDomain}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  // Has custom domain but DNS pending
  if (business.customDomain && business.domainStatus === "pending_dns") {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Domain added:</strong> {business.customDomain}
            <br />
            Configure your DNS records below, then click &quot;Verify DNS&quot;.
          </AlertDescription>
        </Alert>

        <DNSInstructions domain={business.customDomain} vpsIp={vpsIp} />

        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking DNS...
            </>
          ) : (
            <>
              <Globe className="mr-2 h-4 w-4" />
              Verify DNS
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // No custom domain or editing
  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Custom Domain (Optional)
          </label>
          <Input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value.toLowerCase())}
          />
          <p className="text-xs text-gray-500">
            Or use your free subdomain: <strong>{subdomainUrl}</strong>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isSubmitting || !domain}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Domain"
            )}
          </Button>
          {business.customDomain && (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Using subdomain only
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-green-600">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">Using Subdomain</span>
      </div>
      <a
        href={`https://${subdomainUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        {subdomainUrl}
        <ExternalLink className="h-3 w-3" />
      </a>
      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
        Add Custom Domain
      </Button>
    </div>
  );
}

function DNSInstructions({ domain, vpsIp }: { domain: string; vpsIp: string }) {
  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <Card className="border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-3 text-sm font-medium">DNS Configuration Required</h4>
      <p className="mb-3 text-xs text-gray-600">
        Add these DNS records at your domain registrar (GoDaddy, Namecheap,
        etc.):
      </p>

      <div className="space-y-2">
        <DNSRecord type="A" name="@" value={vpsIp} onCopy={copyToClipboard} />
        <DNSRecord type="A" name="www" value={vpsIp} onCopy={copyToClipboard} />
      </div>

      <p className="mt-3 text-xs text-gray-500">
        DNS changes can take up to 24 hours to propagate.
      </p>
    </Card>
  );
}

function DNSRecord({
  type,
  name,
  value,
  onCopy,
}: {
  type: string;
  name: string;
  value: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded border bg-white p-2 text-xs">
      <span className="w-8 font-mono font-semibold">{type}</span>
      <span className="w-12 font-mono">{name}</span>
      <span className="flex-1 font-mono">{value}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => onCopy(value)}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
