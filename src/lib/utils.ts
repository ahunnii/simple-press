import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// import { clsx, type ClassValue } from "clsx"
// import { twMerge } from "tailwind-merge"

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a string to a URL-friendly slug
 * Example: "My Cool Business" -> "my-cool-business"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format currency for display
 * Example: 1999 -> "$19.99"
 */
export function formatCurrency(
  cents: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate domain format
 * Example: "example.com" -> true, "https://example.com" -> false
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Extract subdomain from hostname
 * Example: "store.myapp.com" -> "store"
 */
export function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}

/**
 * Check if subdomain is available (not reserved)
 */
export function isSubdomainReserved(subdomain: string): boolean {
  const reserved = [
    "www",
    "admin",
    "api",
    "app",
    "shop",
    "store",
    "dashboard",
    "analytics",
    "media",
    "cdn",
    "static",
    "assets",
    "blog",
    "help",
    "support",
    "status",
    "dev",
    "staging",
  ];
  return reserved.includes(subdomain.toLowerCase());
}

/**
 * Generate a random code
 */
export function generateCode(length: number = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
