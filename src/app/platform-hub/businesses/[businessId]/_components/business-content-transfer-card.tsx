import { Download } from "lucide-react";

import { Button } from "~/components/ui/button";
import { StoreTransferClient } from "~/components/store-transfer/store-transfer-client";

interface BusinessContentTransferCardProps {
  businessId: string;
  businessName: string;
}

/**
 * Site-content export/import for one business. A plain section, not a Card:
 * `StoreTransferClient` already renders its own Export / Import cards, and
 * wrapping those in another Card nests card-in-card.
 */
export function BusinessContentTransferCard({
  businessId,
  businessName,
}: BusinessContentTransferCardProps) {
  return (
    <section className="space-y-4" aria-labelledby="site-content-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="site-content-heading" className="text-lg font-semibold">
            Site content
          </h2>
          <p className="text-muted-foreground text-sm">
            Export or import this business&apos;s products, pages, template
            fields, media and other content.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/admin/site-export?businessId=${encodeURIComponent(businessId)}`}
              download
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download site export
            </a>
          </Button>
          <p className="text-muted-foreground max-w-xs text-xs sm:text-right">
            The same organized download the owner gets — works even if the
            store is suspended
          </p>
        </div>
      </div>
      <StoreTransferClient
        isPlatformAdmin
        businessId={businessId}
        businessName={businessName}
      />
    </section>
  );
}
