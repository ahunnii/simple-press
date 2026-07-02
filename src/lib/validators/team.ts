import { z } from "zod";

// Mirrors the role constraint on `team.invite` in
// `src/server/api/routers/team.ts` — keep in sync.
export const TEAM_ROLE_VALUES = ["OWNER", "MANAGER", "STAFF"] as const;

export const inviteMemberFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  role: z.enum(TEAM_ROLE_VALUES),
});

export type InviteMemberFormData = z.infer<typeof inviteMemberFormSchema>;
