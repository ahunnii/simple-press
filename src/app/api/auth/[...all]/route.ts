import * as Sentry from "@sentry/nextjs";
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "~/server/better-auth";

const { GET: authGET, POST: authPOST } = toNextJsHandler(auth.handler);

/**
 * Which auth endpoint blew up is the single most useful fact about an auth
 * error, and it is the one fact the reporting hook cannot get on its own:
 * `onAPIError.onError` in `src/server/better-auth/config.tsx` is handed an
 * `AuthContext`, which carries no `Request`, no path and no method. (better-call
 * *does* pass the request to its own `onError`, but better-auth's wrapper drops
 * it and substitutes its context — see `better-auth/dist/api/index.mjs`.)
 *
 * So the tag is set here instead, on a forked isolation scope. better-call
 * invokes the error hook inline inside the awaited `try/catch` around the route
 * handler, so it runs in the same async context as this call — Sentry's Node
 * AsyncLocalStorage strategy carries the scope across those `await`s and the tag
 * lands on the capture. Forking (rather than tagging the ambient scope) also
 * keeps the tag from bleeding into unrelated concurrent requests.
 */
function withAuthPathTag(handler: (request: Request) => Promise<Response>) {
  return (request: Request): Promise<Response> =>
    Sentry.withIsolationScope((scope) => {
      scope.setTag("auth.path", authPathname(request.url));
      return handler(request);
    });
}

/**
 * PATHNAME ONLY — never `request.url`, and never the search string.
 * `/api/auth/verify-email` and `/api/auth/reset-password` receive a live,
 * single-use credential as `?token=…`; shipping the query string to Sentry
 * would put working account-takeover tokens in the issue stream.
 */
function authPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    // Route-handler requests always carry an absolute URL, so this is
    // unreachable in practice — but a throw here would take down the auth
    // endpoint itself, which is never an acceptable trade for a tag.
    return "unknown";
  }
}

export const GET = withAuthPathTag(authGET);
export const POST = withAuthPathTag(authPOST);
