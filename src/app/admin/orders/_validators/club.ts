import { z } from "zod";

import { clubSchema } from "~/lib/validators/club";

const leaderFormItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  role: z.enum([
    "PRESIDENT",
    "VICE_PRESIDENT",
    "SECRETARY",
    "TREASURER",
    "MEMBER",
    "MODERATOR",
    "OWNER",
    "CHAIRMAN",
    "VICE_CHAIR",
    "CAPTAIN",
  ]),
  image: z.string().optional(),
  imageFile: z.instanceof(File).optional().nullable(),
});

const resourceFormItemSchema = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  file: z.instanceof(File).optional().nullable(),
  useUrl: z.boolean().optional(), // true = use URL, false = use file upload
});
// .refine(
//   (data) => {
//     if (data.useUrl) {
//       return !!data.url && !!data.url.trim();
//     } else {
//       return data.file instanceof File;
//     }
//   },

//   {
//     message: (data: { useUrl: boolean; url: string; file: File | null }) =>
//       data.useUrl
//         ? "URL is required when using URL mode"
//         : "File is required when using file upload mode",
//     path: ["url"],
//   },
// );

const galleryImageFormItemSchema = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().min(1, "Alt text is required"),
  file: z.instanceof(File).optional().nullable(),
});

export const clubFormSchema = clubSchema
  .omit({ gallery: true, leaders: true, resources: true })
  .extend({
    logoFile: z.instanceof(File).optional().nullable(),
    imageFile: z.instanceof(File).optional().nullable(),
    gallery: z.array(galleryImageFormItemSchema),
    leaders: z.array(leaderFormItemSchema),
    resources: z.array(resourceFormItemSchema),
  });

export type ClubFormSchema = z.infer<typeof clubFormSchema>;
