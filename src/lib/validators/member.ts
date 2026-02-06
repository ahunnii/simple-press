import { z } from "zod";

export const MEMBER_ROLES = ["ADMIN", "MEMBER", "MODERATOR", "OWNER"] as const;

export const memberSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(MEMBER_ROLES),
  isSubscribed: z.boolean(),
});

export type MemberFormData = z.infer<typeof memberSchema>;
