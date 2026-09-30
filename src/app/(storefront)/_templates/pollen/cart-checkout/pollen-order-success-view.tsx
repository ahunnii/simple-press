"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Picks which fully server-rendered page `/order/success` shows. The route
 * hands templates no `searchParams`, so only the client can see whether a
 * `session_id` is present — yet each state needs its own page band (a
 * no-order visit must not read "Order Confirmed"). The server page renders
 * both bands as slots; this switch mounts exactly one, so the unused
 * branch's client effects (cart clear, session fetch) never run.
 */
export function PollenOrderSuccessView({
  confirmed,
  notFound,
}: {
  confirmed: ReactNode;
  notFound: ReactNode;
}) {
  const hasSession = Boolean(useSearchParams().get("session_id"));
  return <>{hasSession ? confirmed : notFound}</>;
}
