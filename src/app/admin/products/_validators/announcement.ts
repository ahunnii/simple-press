import { z } from "zod";

import { announcementSchema } from "~/lib/validators/announcement";

export const announcementFormSchema = announcementSchema;

export type AnnouncementFormSchema = z.infer<typeof announcementFormSchema>;

/** Edit form – omits clubId since club is fixed when editing */
export const announcementEditFormSchema = announcementSchema.omit({
  clubId: true,
});

export type AnnouncementEditFormSchema = z.infer<
  typeof announcementEditFormSchema
>;
