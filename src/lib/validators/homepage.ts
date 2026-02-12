import z from "zod";

// type Feature = {
//     title: string;
//     description: string;
//     icon: string;
//   };

//   type SocialLinks = {
//     instagram?: string;
//     facebook?: string;
//     twitter?: string;
//     linkedin?: string;
//   };

//   type HomepageEditorProps = {
//     business: {
//       id: string;
//       name: string;
//       subdomain: string;
//       customDomain: string | null;
//     };
//     siteContent: {
//       id: string;
//       heroTitle: string | null;
//       heroSubtitle: string | null;
//       heroImageUrl: string | null;
//       heroButtonText: string | null;
//       heroButtonLink: string | null;
//       aboutTitle: string | null;
//       aboutText: string | null;
//       aboutImageUrl: string | null;
//       features: any;
//       footerText: string | null;
//       socialLinks: any;
//     };
//   };

export const homepageFormSchema = z.object({
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  heroButtonText: z.string().optional(),
  heroButtonLink: z.string().optional(),
  aboutTitle: z.string().optional(),
  aboutText: z.string().optional(),
  aboutImageUrl: z.string().url().optional().or(z.literal("")),
  features: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string(),
      }),
    )
    .optional(),
  footerText: z.string().optional(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
  heroImageFile: z.instanceof(File).optional().nullable(),
  aboutImageFile: z.instanceof(File).optional().nullable(),
});

export type HomepageFormSchema = z.infer<typeof homepageFormSchema>;
