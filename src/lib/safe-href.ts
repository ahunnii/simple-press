import { z } from "zod";

/**
 * Scheme guard for owner-editable link values.
 *
 * Why this module exists: `z.string().url()` is NOT a scheme guard. Zod 3.25
 * accepts `javascript:alert(1)`, `data:text/html,…` and `ftp://…` — they all
 * parse as URLs. Every owner-editable `href` on the storefront (social links,
 * navigation, hero/CTA buttons, banner + popup links, template `url` fields,
 * list-row link keys) is therefore only protected today by React 19 rewriting
 * `javascript:` in JSX `href`/`src` props. That is a framework internal, it
 * does not cover `window.open`, `dangerouslySetInnerHTML`, or any non-React
 * output, and it should not be the only thing standing between a compromised
 * or malicious store admin and stored XSS on the storefront.
 *
 * The rule, deliberately permissive about *shape* and strict about *scheme*:
 * a value with no scheme is relative and cannot execute, so it passes
 * untouched (legacy owner data is full of `www.example.com`, `/shop`, `#top`).
 * A value that does carry a scheme must carry one of the five that can appear
 * in an owner link.
 *
 * Both halves are pure and client-safe — no `server-only`, no `~/server/*`,
 * no `~/env` — because this runs inside template render paths that ship to
 * the browser.
 */

/** Schemes an owner link may use. Everything else is refused. */
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto", "tel", "sms"]);

/** RFC 3986 scheme production, anchored: `scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )`. */
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * C0 controls + DEL. `java\tscript:` and `java\nscript:` are the classic
 * scheme-splitting obfuscations — browsers strip TAB/CR/LF while parsing a
 * URL, so the tab-laced value executes. None of them belong in a real link,
 * so their presence anywhere is enough to refuse the value outright.
 */
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/;

/**
 * Leading characters that a consumer might strip before parsing a scheme:
 * whitespace plus the zero-width / BOM family. A browser would treat
 * `<U+200B>javascript:1` as relative, but we refuse it rather than rely on
 * every downstream consumer agreeing.
 */
const LEADING_IGNORABLE_RE = /^[\s\u200B-\u200F\u2060\uFEFF]+/;

/** Max rounds of percent-decoding applied when probing for a hidden scheme. */
const MAX_DECODE_ROUNDS = 3;

/** Returns the lowercased scheme of `value`, or `null` when it has none. */
function schemeOf(value: string): string | null {
  const stripped = value.replace(LEADING_IGNORABLE_RE, "");
  const match = SCHEME_RE.exec(stripped);
  if (!match) return null;
  return match[0].slice(0, -1).toLowerCase();
}

/**
 * Validates an owner-supplied link value.
 *
 * Returns the **trimmed original** when the value is safe to render as an
 * `href`, or `null` when it is not. The decoded form is only ever used for
 * the scheme probe — it is never returned, so a legitimate `%20` in a path
 * survives verbatim.
 *
 * Accepted: anything without a scheme (`/shop`, `#top`, `?q=1`,
 * `www.example.com`, `//cdn.example.com/a.js` — protocol-relative cannot
 * execute and is common for CDN links), plus `http`, `https`, `mailto`,
 * `tel`, `sms` in any casing.
 *
 * Refused: every other scheme (`javascript:`, `data:`, `vbscript:`, `file:`,
 * `blob:`, `ftp:`), any value containing a control character, and any value
 * whose percent-decoded form reveals a refused scheme (`%6Aavascript:`,
 * `%256Aavascript:`).
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (CONTROL_CHAR_RE.test(trimmed)) return null;

  // Probe every decoding stage, not just the last one: a refused scheme is a
  // refusal whether it is visible now or only after the browser (or any other
  // consumer) collapses layered encoding.
  let probe = trimmed;
  for (let round = 0; round <= MAX_DECODE_ROUNDS; round++) {
    if (CONTROL_CHAR_RE.test(probe)) return null;

    const scheme = schemeOf(probe);
    if (scheme !== null && !ALLOWED_SCHEMES.has(scheme)) return null;

    if (round === MAX_DECODE_ROUNDS) break;

    let decoded: string;
    try {
      decoded = decodeURIComponent(probe);
    } catch {
      // Malformed encoding (a bare `%` in `…/100%discount`, say). Unlike
      // `sanitizeRedirectTo` — which refuses outright because rejecting an
      // inbound query param is free — refusing here would silently break
      // legitimate stored owner links. Stop decoding and judge what we have:
      // a value the URL parser cannot decode is also one whose leading bytes
      // it reads literally, so the checks already run on `probe` are the
      // ones that matter.
      break;
    }
    if (decoded === probe) break;
    probe = decoded;
  }

  return trimmed;
}

/** User-facing copy for a refused link. Shared by every schema below. */
export const SAFE_HREF_MESSAGE =
  "Link must be a relative path or start with http://, https://, mailto:, tel:, or sms:";

/**
 * Zod refinement predicate. Empty is allowed: owners clear a text field to
 * `""`, not `null` (see the blank-aware note in CLAUDE.md), and a cleared
 * link must stay clearable.
 *
 * Exported so fields with their own length cap (`navigationItems.href` is
 * 500) can reuse the rule without inheriting `safeHrefSchema`'s 2048.
 */
export function isSafeHref(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.trim() === "" || safeHref(value) !== null;
}

/** Owner-editable link field. Accepts `""` (cleared); refuses unsafe schemes. */
export const safeHrefSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || safeHref(v) !== null, {
    message: SAFE_HREF_MESSAGE,
  });

/**
 * Read-time convenience for the `f["key"] || "/fallback"` pattern templates
 * use for link props: returns `fallback` when the stored value is missing,
 * blank, or unsafe.
 */
export function safeHrefOr(value: unknown, fallback: string): string {
  return safeHref(value) ?? fallback;
}
