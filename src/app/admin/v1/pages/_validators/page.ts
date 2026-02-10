import { z } from "zod";

import { pageSchema } from "~/lib/validators/page";

export const pageFormSchema = pageSchema;

export type PageFormSchema = z.infer<typeof pageFormSchema>;

/** Edit form – omits clubId since club is fixed when editing */
export const pageEditFormSchema = pageSchema.omit({
  clubId: true,
});

export type PageEditFormSchema = z.infer<typeof pageEditFormSchema>;
