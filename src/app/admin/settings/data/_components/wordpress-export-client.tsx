"use client";

import { AlertCircle, Download, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isPlatformAdmin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WordPressExportClient({ isPlatformAdmin }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="text-muted-foreground h-5 w-5" />
            Download your export
          </CardTitle>
          <CardDescription>
            One ZIP archive with everything you need to move your store to a
            self-hosted WordPress + WooCommerce site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li>
              <code className="bg-muted rounded px-1 font-mono text-xs">
                content.wxr.xml
              </code>{" "}
              — pages, blog posts &amp; policies for the WordPress importer
            </li>
            <li>
              <code className="bg-muted rounded px-1 font-mono text-xs">
                products.csv
              </code>{" "}
              — for the WooCommerce product importer
            </li>
            <li>
              <code className="bg-muted rounded px-1 font-mono text-xs">
                records/
              </code>{" "}
              CSVs — orders, customers, discounts, and reviews, for your records
            </li>
            <li>
              <code className="bg-muted rounded px-1 font-mono text-xs">
                data.json
              </code>{" "}
              — a complete machine-readable backup of your store
            </li>
            <li>
              <code className="bg-muted rounded px-1 font-mono text-xs">
                README.md
              </code>{" "}
              — a step-by-step migration guide. Start there.
            </li>
          </ul>

          {isPlatformAdmin && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                As a Platform Admin you can export any business by appending{" "}
                <code className="bg-muted rounded px-1 font-mono text-xs">
                  ?businessId=&lt;id&gt;
                </code>{" "}
                to the export URL.
              </AlertDescription>
            </Alert>
          )}

          <Button asChild>
            <a href="/api/admin/wordpress-export" download>
              <Download className="mr-2 h-4 w-4" />
              Export to WordPress
            </a>
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Media stays on SimplePress until you import</AlertTitle>
        <AlertDescription>
          Your images aren&apos;t inside the zip. WordPress downloads them from
          your SimplePress site during the WXR import (check &quot;Download and
          import file attachments&quot;), so run the WordPress import while your
          store here is still active.
        </AlertDescription>
      </Alert>

      <p className="text-muted-foreground text-sm">
        <strong>What happens next:</strong> the README inside the zip walks
        through the full migration — importing{" "}
        <code className="bg-muted rounded px-1 font-mono text-xs">
          content.wxr.xml
        </code>{" "}
        into WordPress, importing{" "}
        <code className="bg-muted rounded px-1 font-mono text-xs">
          products.csv
        </code>{" "}
        into WooCommerce, and reconnecting the same Stripe account using the
        WooCommerce Stripe Gateway plugin.
      </p>
    </div>
  );
}
