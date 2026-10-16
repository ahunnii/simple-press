/**
 * Turns whatever an owner types into the link box of the rich-text editor
 * into a value that is safe to store and survives a domain change.
 *
 * Why: the box used to be `<input type="url">`, which rejects `/contact`, and
 * owners who pasted the full address of their own page (`https://mystore.com/
 * contact`) ended up with links that break the day the store moves to a
 * custom domain. Pure and client-safe so it can be unit-tested and reused.
 *
 * | Input                                   | Result                          |
 * | --------------------------------------- | ------------------------------- |
 * | `/contact`, `/shop?x=1#top`, `#faq`     | unchanged                       |
 * | `contact`, `about-us`, `shop/tees`      | `/contact`, `/about-us`, …      |
 * | `https://<this store>/contact?a=1#b`    | `/contact?a=1#b`                |
 * | `https://example.com/x`                 | unchanged                       |
 * | `www.example.com`, `example.com/x`      | `https://www.example.com`, …    |
 * | `mailto:`, `tel:`, `sms:`               | unchanged                       |
 * | `javascript:…`, `data:…`, spaces, empty | `null` (refused)                |
 */
import { safeHref } from "~/lib/safe-href";

export type NormalizeEditorHrefOptions = {
  /** Hosts (with port when non-default) that mean "this store". */
  siteHosts?: readonly string[];
};

const HTTP_SCHEME_RE = /^https?:\/\//i;
const OTHER_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
/** `localhost:3000/x` — looks like a scheme to a regex but is a host:port. */
const HOST_PORT_RE = /^[a-z0-9.-]+:\d+(?:[/?#]|$)/i;

function normalizeHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function isSiteHost(host: string, siteHosts: readonly string[]): boolean {
  const h = normalizeHost(host);
  return siteHosts.some((s) => s && normalizeHost(s) === h);
}

/** If `url` points at this store, its path + search + hash; else null. */
function toSitePath(url: string, siteHosts: readonly string[]): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!isSiteHost(parsed.host, siteHosts)) return null;
  return `${parsed.pathname || "/"}${parsed.search}${parsed.hash}`;
}

/**
 * Returns the normalised href, or `null` when the input is empty or not safe
 * to use as a link.
 */
export function normalizeEditorHref(
  input: string,
  { siteHosts = [] }: NormalizeEditorHrefOptions = {},
): string | null {
  const value = input.trim();
  if (value === "") return null;
  if (/\s/.test(value)) return null;

  let result: string;

  if (value.startsWith("//")) {
    // Protocol-relative: external, leave as is.
    result = value;
  } else if (/^[/#?]/.test(value)) {
    result = value;
  } else if (HTTP_SCHEME_RE.test(value)) {
    result = toSitePath(value, siteHosts) ?? value;
  } else if (OTHER_SCHEME_RE.test(value) && !HOST_PORT_RE.test(value)) {
    // mailto:, tel:, sms: pass; javascript:, data:, … are refused below.
    result = value;
  } else {
    const firstSegment = value.split(/[/?#]/, 1)[0]!;
    if (firstSegment.includes(".") || HOST_PORT_RE.test(value)) {
      // Looks like a domain (`www.example.com`, `example.com/x`).
      const withScheme = `https://${value}`;
      result = toSitePath(withScheme, siteHosts) ?? withScheme;
    } else {
      // Bare word or relative path: a page on this site.
      result = `/${value}`;
    }
  }

  return safeHref(result);
}
