import { z } from "zod";

/** Form uses datetime-local strings; convert to Date when calling API */
export const eventSchema = z.object({
  clubId: z.string().min(1),
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  description: z.string().optional(),
  mediaUrl: z.string().optional(),
  isPublic: z.boolean(),
  location: z.string().optional(),
});

export type EventFormData = z.infer<typeof eventSchema>;
