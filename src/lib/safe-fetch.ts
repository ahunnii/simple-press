import dns from "node:dns/promises";
import net from "node:net";

/**
 * SSRF-hardened fetch helper for downloading URLs with server-side validation.
 *
 * Even when URLs come from trusted sources (partner APIs, admin-entered import
 * sources), we never want the server tricked into hitting internal/metadata
 * endpoints (e.g. 169.254.169.254, localhost, RFC1918 ranges). This module
 * validates the URL, resolves the host, and refuses any address that maps to a
 * private/reserved range. It also caps the response size and time, and refuses
 * redirects (a common SSRF bypass).
 *
 * Originally ported from artisanal-futures-site's `src/server/lib/safe-fetch.ts`,
 * with deliberate deviations for different use cases:
 *   - https-only by default; set `allowHttp: true` to accept plain http (used
 *     by WooCommerce product imports, where many storefronts serve media over
 *     plain http rather than https).
 *   - returns raw bytes + content-type rather than text, since the primary
 *     payload is images, not JSON/HTML.
 *
 * ALL security checks apply regardless of scheme: DNS resolution to a public IP,
 * no credentials, no redirects, byte cap, timeout. For http, only the default
 * port 80 is allowed (or explicitly configured default); non-default ports are
 * rejected the same way they are for https.
 *
 * Residual risk: there is a small TOCTOU window between the DNS resolution
 * done here and the resolution performed by `fetch` itself. Given the host
 * typically comes from authenticated/admin input (not arbitrary user input) and
 * redirects are refused, this is an acceptable trade-off.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number(p));
  return (
    ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0
  );
}

function inCidr(ip: string, network: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask);
}

function isPrivateIPv4(ip: string): boolean {
  return (
    inCidr(ip, "0.0.0.0", 8) || // "this" network
    inCidr(ip, "10.0.0.0", 8) || // private
    inCidr(ip, "100.64.0.0", 10) || // CGNAT
    inCidr(ip, "127.0.0.0", 8) || // loopback
    inCidr(ip, "169.254.0.0", 16) || // link-local (incl. cloud metadata)
    inCidr(ip, "172.16.0.0", 12) || // private
    inCidr(ip, "192.0.0.0", 24) || // IETF protocol assignments
    inCidr(ip, "192.0.2.0", 24) || // TEST-NET-1
    inCidr(ip, "192.168.0.0", 16) || // private
    inCidr(ip, "198.18.0.0", 15) || // benchmarking
    inCidr(ip, "198.51.100.0", 24) || // TEST-NET-2
    inCidr(ip, "203.0.113.0", 24) || // TEST-NET-3
    inCidr(ip, "224.0.0.0", 4) || // multicast
    inCidr(ip, "240.0.0.0", 4) // reserved / broadcast
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4.
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower);
  if (mapped) return isPrivateIPv4(mapped[1]!);

  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (
    lower.startsWith("fe80") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true; // link-local fe80::/10
  }
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  return false;
}

function isBlockedAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown format → block
}

/**
 * Validate scheme/credentials and return a normalized URL, or throw.
 * When allowHttp is true, accepts both http and https; when false (default),
 * only accepts https. In either case, only the default port for the scheme
 * is allowed (443 for https, 80 for http).
 */
export function assertPublicHttpsUrl(rawUrl: string, allowHttp = false): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("Invalid URL.");
  }

  const isHttp = url.protocol === "http:";
  const isHttps = url.protocol === "https:";

  if (isHttp && !allowHttp) {
    throw new SafeFetchError("Only https URLs are allowed.");
  }
  if (!isHttp && !isHttps) {
    throw new SafeFetchError("Only http and https URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new SafeFetchError("URLs with embedded credentials are not allowed.");
  }

  // Only allow the default port for the scheme to avoid probing internal services.
  // http defaults to 80, https defaults to 443.
  const defaultPort = isHttp ? "80" : "443";
  if (url.port && url.port !== defaultPort) {
    throw new SafeFetchError("Only standard web ports are allowed.");
  }

  return url;
}

/** Resolve a hostname and throw if any address is private/reserved. */
export async function assertHostResolvesPublic(
  hostname: string,
): Promise<void> {
  // `URL.hostname` keeps the brackets around IPv6 literals (e.g. "[::1]");
  // strip them before checking with `net.isIP`, or a bracketed private
  // literal would fall through to DNS resolution instead of being blocked.
  const literal =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

  if (net.isIP(literal)) {
    if (isBlockedAddress(literal)) {
      throw new SafeFetchError("Refusing to fetch a private/reserved address.");
    }
    return;
  }
  let records: { address: string }[];
  try {
    records = await dns.lookup(literal, { all: true });
  } catch {
    throw new SafeFetchError(`Could not resolve host "${hostname}".`);
  }
  if (records.length === 0) {
    throw new SafeFetchError(`Could not resolve host "${hostname}".`);
  }
  for (const record of records) {
    if (isBlockedAddress(record.address)) {
      throw new SafeFetchError(
        `Refusing to fetch "${hostname}" — it resolves to a private/reserved address.`,
      );
    }
  }
}

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  allowHttp?: boolean;
};

export type SafeFetchResult = {
  bytes: Buffer;
  contentType: string | null;
};

/**
 * Fetch a URL as raw bytes with SSRF protections, a timeout, and a size cap.
 * By default refuses non-https URLs, private/reserved addresses, redirects, and
 * non-2xx responses. Set `allowHttp: true` to accept http URLs (still validates
 * all other security checks: DNS resolution to public IP, no credentials, no
 * redirects, byte cap, timeout).
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    allowHttp = false,
  } = options;

  const url = assertPublicHttpsUrl(rawUrl, allowHttp);
  await assertHostResolvesPublic(url.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { accept: "image/*,*/*;q=0.5" },
    });

    if (res.status >= 300 && res.status < 400) {
      console.error(
        `[safeFetch] ${url.href} redirected (HTTP ${res.status}) to "${
          res.headers.get("location") ?? "?"
        }" — refusing to follow.`,
      );
      throw new SafeFetchError("Refusing to follow a redirect.");
    }
    if (!res.ok) {
      console.error(`[safeFetch] ${url.href} responded HTTP ${res.status}.`);
      throw new SafeFetchError(`Request responded with HTTP ${res.status}.`);
    }

    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > maxBytes) {
      throw new SafeFetchError("Response is too large.");
    }

    const contentType = res.headers.get("content-type");

    if (!res.body) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > maxBytes) {
        throw new SafeFetchError("Response is too large.");
      }
      return { bytes: buf, contentType };
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new SafeFetchError("Response is too large.");
        }
        chunks.push(value);
      }
    }
    return {
      bytes: Buffer.concat(chunks.map((c) => Buffer.from(c))),
      contentType,
    };
  } catch (err) {
    if (err instanceof SafeFetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new SafeFetchError("Timed out fetching resource.");
    }
    console.error(`[safeFetch] ${url.href} failed:`, err);
    throw new SafeFetchError("Failed to fetch resource.");
  } finally {
    clearTimeout(timer);
  }
}
