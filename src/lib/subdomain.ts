// lib/subdomain.ts

import { env } from "~/env";

export function getMainDomain(): string {
  const isDev = process.env.NODE_ENV === "development";
  return isDev ? "localhost:3000" : env.NEXT_PUBLIC_PLATFORM_DOMAIN;
}

export function getSubdomainFromHost(host: string): string | null | undefined {
  const mainDomain = getMainDomain();

  if (host === mainDomain) {
    return null; // On main domain
  }

  // Extract subdomain
  // "mystore.localhost:3000" -> "mystore"
  // "mystore.mainplatform.com" -> "mystore"
  const parts = host.split(".");

  if (process.env.NODE_ENV === "development") {
    // localhost:3000 format: mystore.localhost:3000
    if (host.includes("localhost")) {
      return parts[0] === "localhost" ? null : (parts[0] ?? null);
    }
  } else {
    // Production format: mystore.mainplatform.com
    if (parts.length > 2) {
      return parts[0] ?? null;
    }

    return null;
  }
}

export function buildSubdomainUrl(subdomain: string, path = "/"): string {
  const isDev = process.env.NODE_ENV === "development";
  const mainDomain = getMainDomain();

  if (isDev) {
    return `http://${subdomain}.${mainDomain}${path}`;
  } else {
    return `https://${subdomain}.${mainDomain}${path}`;
  }
}

export function getCallbackUrl(): string {
  const isDev = process.env.NODE_ENV === "development";
  const mainDomain = getMainDomain();

  if (isDev) {
    return `http://${mainDomain}/api/stripe/connect/callback`;
  } else {
    return `https://${mainDomain}/api/stripe/connect/callback`;
  }
}
