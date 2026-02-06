import { z } from "zod";

export const announcementSchema = z.object({
  clubId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;
