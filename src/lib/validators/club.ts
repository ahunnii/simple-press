import { z } from "zod";

export const CLUB_TYPES = [
  "CLEAN_AND_GREEN",
  "SAFE_AND_SECURE",
  "SUPPORT_AND_CONNECTION",
  "OTHER",
] as const;

export type ClubType = (typeof CLUB_TYPES)[number];

export const LEADER_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "CHAIRMAN",
  "VICE_CHAIR",
  "CAPTAIN",
  "MEMBER",
  "MODERATOR",
  "OWNER",
] as const;

export type LeaderRole = (typeof LEADER_ROLES)[number];

const leaderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  role: z.enum(LEADER_ROLES),
  image: z.string().optional(),
});

const resourceSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
});

const galleryImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  alt: z.string().min(1, "Alt text is required"),
});

export const clubSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  logo: z.string().optional(),
  type: z.enum(CLUB_TYPES),
  isFeatured: z.boolean(),
  tagline: z.string().optional(),
  quickDescription: z.string().optional(),
  email: z.string().optional(),
  highlights: z.array(z.string()),
  leaders: z.array(leaderSchema),
  resources: z.array(resourceSchema),
  gallery: z.array(galleryImageSchema),
});

export type ClubFormData = z.infer<typeof clubSchema>;
export type LeaderFormItem = z.infer<typeof leaderSchema>;
export type ResourceFormItem = z.infer<typeof resourceSchema>;
export type GalleryImageFormItem = z.infer<typeof galleryImageSchema>;

export function formatClubType(type: ClubType): string {
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
