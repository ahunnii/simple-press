import Link from "next/link";
import { ExternalLink, Eye, FileText, Package, Settings } from "lucide-react";

import { env } from "~/env";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type Business = {
  subdomain: string;
  customDomain: string | null;
  domainStatus: string;
};

type QuickActionsProps = {
  business: Business;
};

export function QuickActions({ business }: QuickActionsProps) {
  const storefrontUrl =
    business.customDomain && business.domainStatus === "active"
      ? `https://${business.customDomain}`
      : `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

  const isDev = process.env.NODE_ENV === "development";
  const devUrl = `http://${business.subdomain}.localhost:3000`;

  return (
    <div className="space-y-6">
      {/* Preview Store */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview Your Store</CardTitle>
          <CardDescription>See what customers will see</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full gap-2">
            <a
              href={isDev ? devUrl : storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="h-4 w-4" />
              View Storefront
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-2"
          >
            <Link href="/admin/products/new">
              <Package className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-2"
          >
            <Link href="/admin/settings">
              <Settings className="h-4 w-4" />
              Store Settings
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-2"
          >
            <Link href="/admin/content">
              <FileText className="h-4 w-4" />
              Edit Content
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
          <CardDescription>We&apos;re here to help you succeed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <a
            href={env.NEXT_PUBLIC_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="mailto:support@example.com"
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            Contact Support
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
