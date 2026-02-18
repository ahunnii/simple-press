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

export const brandingFormSchema = z.object({
  footerText: z.string().optional().nullable(),
  socialLinks: z
    .object({
      instagram: z.string().optional().nullable(),
      facebook: z.string().optional().nullable(),
      twitter: z.string().optional().nullable(),
      linkedin: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  logoUrl: z.string().url().optional().nullable(),
  logoFile: z.instanceof(File).optional().nullable(),
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
  accentColor: z.string().nullable(),
  templateId: z.string(),
  faviconUrl: z.string().url().optional().nullable(),
  faviconFile: z.instanceof(File).optional().nullable(),
});

export type BrandingFormSchema = z.infer<typeof brandingFormSchema>;
