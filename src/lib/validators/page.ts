import { z } from "zod";

/** ProseMirror/TipTap JSON document */
export const pageContentSchema = z.record(z.string(), z.unknown());

export const pageSchema = z.object({
  clubId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  content: pageContentSchema,
});

export type PageFormData = z.infer<typeof pageSchema>;

export const EMPTY_TIPTAP_DOC = {
  type: "doc",
  content: [] as unknown[],
} as const;
