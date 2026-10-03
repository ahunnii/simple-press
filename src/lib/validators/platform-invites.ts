import { z } from "zod";

// Mirrors the input of `platformInvites.invite` in
// `src/server/api/routers/platform-invites.ts` — keep in sync.

export const inviteRoleSchema = z.enum(["OWNER", "MANAGER", "STAFF"]);

export const inviteMemberFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: inviteRoleSchema,
});

export type InviteMemberFormData = z.infer<typeof inviteMemberFormSchema>;
