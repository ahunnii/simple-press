import { getBusinessUrl } from "~/lib/business-url";
import { api } from "~/trpc/react";

export function useSiteHost(): string {
  const { data: businessInfo } = api.business.simplifiedGet.useQuery();
  return businessInfo
    ? getBusinessUrl({
        subdomain: businessInfo.subdomain,
        customDomain: businessInfo.customDomain,
        domainStatus: businessInfo.domainStatus,
      }).replace(/^https?:\/\//, "")
    : "yourstore.com";
}
