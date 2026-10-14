/**
 * Paths the Umami tracker must never count: the owner/admin surfaces, auth,
 * the Site Editor, API routes, hosted invoice pages and the platform's own
 * back offices. Owners spend most of their time on these, so counting them
 * inflates a store's own stats with its own activity.
 *
 * `/invoice/<token>` is skipped as well: it is a customer payment page rather
 * than storefront browsing, and the secret token in the URL would otherwise be
 * stored as a "page" in the store's analytics.
 */
export const UMAMI_EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/auth",
  "/editor",
  "/api",
  "/invoice",
  "/not-permitted",
  "/platform",
  "/platform-hub",
] as const;

/** Global name Umami looks up (`data-before-send`) before each event is sent. */
export const UMAMI_BEFORE_SEND_FN = "__spUmamiBeforeSend";

/** True when `pathname` (no query string needed) is one of the excluded surfaces. */
export function isUmamiExcludedPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0]!.toLowerCase();
  return UMAMI_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Inline source for the global before-send hook. Umami v2 (confirmed against the deployed script.js) calls
 * `window[data-before-send](type, payload)` for every pageview and event and
 * drops it when the hook returns a falsy value. The layout only renders the
 * tracker on storefront paths, but it persists across soft navigations, so an
 * owner who opens the storefront and then clicks into /admin would otherwise
 * keep being counted; this hook closes that gap, and also drops Site Editor
 * preview frames (`?__preview=1`).
 */
export function buildUmamiBeforeSendSource(): string {
  const prefixes = JSON.stringify(UMAMI_EXCLUDED_PATH_PREFIXES);
  return `window.${UMAMI_BEFORE_SEND_FN}=function(t,p){try{var u=new URL(p&&p.url||location.href,location.href);var a=u.pathname.toLowerCase();if(u.searchParams.get("__preview")==="1"||new URL(location.href).searchParams.get("__preview")==="1")return false;var x=${prefixes};for(var i=0;i<x.length;i++){if(a===x[i]||a.indexOf(x[i]+"/")===0)return false}}catch(e){}return p};`;
}
