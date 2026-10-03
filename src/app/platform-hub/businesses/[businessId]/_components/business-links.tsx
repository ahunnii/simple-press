import Link from "next/link";
import { ExternalLink, Images } from "lucide-react";

import { getBusinessUrl } from "~/lib/business-url";
import { Button } from "~/components/ui/button";

type Props = {
  businessId: string;
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
};

export function BusinessLinks({
  businessId,
  subdomain,
  customDomain,
  domainStatus,
}: Props) {
  const storefrontUrl = getBusinessUrl({
    subdomain,
    customDomain,
    domainStatus,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open storefront
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={`${storefrontUrl}/admin`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open shop admin
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/businesses/${businessId}/media`}>
          <Images className="mr-2 h-4 w-4" />
          Media Library
        </Link>
      </Button>
    </div>
  );
}
