import { z } from "zod";

import type { TiptapJSON } from "~/components/tiptap-renderer";

/**
 * Client-safe maintenance-mode config: schemas, types, and pure resolvers
 * shared by `~/lib/maintenance.ts` (server resolver) and client components
 * (e.g. the maintenance-mode admin editor, storefront maintenance screen).
 *
 * Deliberately has NO imports from `~/server/*` or anything else server-only.
 */

/**
 * Node types that carry their meaning via `attrs` rather than a nested
 * `content` array (e.g. a standalone image has no children but is obviously
 * not empty). Mirrors `LEAF_CONTENT_NODE_TYPES` / `isContentEmpty` in
 * `~/lib/template-fields.ts`.
 *
 * Duplicated locally rather than importing `template-fields.ts`: that module
 * re-exports every storefront template's field registry, and several
 * templates' page components import `~/server/db` / `~/server/better-auth/server`
 * directly (e.g. `_templates/pink/products/pink-product-page.tsx`,
 * `_templates/vii/homepage/vii-homepage.tsx`,
 * `_templates/sledge/homepage/sledge-homepage.tsx`). Auditing every template's
 * import graph to prove none of that leaks into the aggregated exports isn't
 * worth the risk for a module that must stay importable from client
 * components, so this file keeps its own minimal equivalent instead.
 */
const LEAF_CONTENT_NODE_TYPES = new Set([
  "image",
  "horizontalRule",
  "hardBreak",
  "gallery",
  "embed",
]);

/** Local equivalent of `isContentEmpty` from `~/lib/template-fields.ts` (see note above). */
function isEmptyDoc(content: unknown): boolean {
  if (content === null || content === undefined) {
    return true;
  }

  if (typeof content === "string") {
    return content === "";
  }

  if (Array.isArray(content)) {
    return content.every((item) => isEmptyDoc(item));
  }

  if (typeof content !== "object") {
    return true;
  }

  const node = content as { type?: unknown; text?: unknown; content?: unknown };

  if (typeof node.type === "string" && LEAF_CONTENT_NODE_TYPES.has(node.type)) {
    return false;
  }

  if (typeof node.text === "string" && node.text !== "") {
    return false;
  }

  if (!node.content) {
    return true;
  }

  return isEmptyDoc(node.content);
}

/**
 * Validates a TipTap doc (as stored, e.g. in `Business.maintenanceMessage`).
 * Loose on node shape — only checks the doc envelope — but caps overall size
 * so a pathological payload can't be persisted.
 */
export const maintenanceMessageSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough()
  .refine((v) => JSON.stringify(v).length <= 20_000, {
    message: "Message is too long",
  });

const maintenanceCtaLabelSchema = z.string().trim().min(1).max(80);

export const maintenanceCtaSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("external"),
    label: maintenanceCtaLabelSchema,
    value: z
      .string()
      .trim()
      .url()
      .max(500)
      .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) URL"),
  }),
  z.object({
    type: z.literal("call"),
    label: maintenanceCtaLabelSchema,
    value: z
      .string()
      .trim()
      .regex(/^\+?[\d\s\-().]{5,24}$/, "Enter a valid phone number")
      .optional(),
  }),
  z.object({
    type: z.literal("email"),
    label: maintenanceCtaLabelSchema,
    value: z.string().trim().email().max(320).optional(),
  }),
]);

/** Stored shape of a maintenance CTA — validated input, not yet resolved to an `href`. */
export type MaintenanceCtaInput = z.infer<typeof maintenanceCtaSchema>;
export type MaintenanceCtaType = MaintenanceCtaInput["type"];

/** A CTA ready to render — `href` already resolved (falling back to business contact info where applicable). */
export type ResolvedMaintenanceCta = {
  type: MaintenanceCtaType;
  label: string;
  href: string;
};

/**
 * Validates `cta` and resolves it to a renderable `{ label, href }`.
 *
 * - `external`: `href` is always the (required) provided URL.
 * - `call`: falls back to `business.phoneNumber` when no value is set;
 *   returns `null` if neither is present/non-blank. `href` strips everything
 *   from the effective number except digits and a leading `+`.
 * - `email`: falls back to `business.supportEmail` when no value is set;
 *   returns `null` if neither is present/non-blank.
 *
 * Returns `null` for invalid/missing input, or a `call`/`email` CTA with no
 * usable contact value.
 */
export function resolveMaintenanceCta(
  cta: unknown,
  business: { phoneNumber: string | null; supportEmail: string | null },
): ResolvedMaintenanceCta | null {
  const parsed = maintenanceCtaSchema.safeParse(cta);
  if (!parsed.success) return null;

  const { type, label, value } = parsed.data;

  if (type === "external") {
    return { type, label, href: value };
  }

  if (type === "call") {
    const effective = (value ?? business.phoneNumber)?.trim();
    if (!effective) return null;
    const hasLeadingPlus = effective.startsWith("+");
    const digits = effective.replace(/\D/g, "");
    return { type, label, href: `tel:${hasLeadingPlus ? "+" : ""}${digits}` };
  }

  // type === "email"
  const effective = (value ?? business.supportEmail)?.trim();
  if (!effective) return null;
  return { type, label, href: `mailto:${effective}` };
}

/** Wraps plain text in a single-paragraph TipTap doc. Callers handle empty/whitespace input themselves. */
export function wrapPlainTextAsTiptapDoc(text: string): TiptapJSON {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  } as TiptapJSON;
}

/**
 * Normalizes a raw maintenance-message value (e.g. from `customFields` or a
 * legacy plain-text column) into a TipTap doc, or `null` when there's nothing
 * to show.
 *
 * - `null`/`undefined` → `null`.
 * - string → trimmed; empty → `null`; otherwise wrapped via
 *   `wrapPlainTextAsTiptapDoc` (legacy plain-text values, e.g. old
 *   store-transfer imports).
 * - a TipTap doc object (`type === "doc"`, array `content`) → returned as-is,
 *   or `null` if it's empty per `isEmptyDoc`.
 * - anything else → `null`.
 */
export function normalizeMaintenanceMessage(value: unknown): TiptapJSON | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? wrapPlainTextAsTiptapDoc(trimmed) : null;
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return isEmptyDoc(value) ? null : (value as TiptapJSON);
  }

  return null;
}
