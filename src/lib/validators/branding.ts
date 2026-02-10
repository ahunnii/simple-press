import z from "zod";

export const businessBrandingFormSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  siteContent: z
    .object({
      heroTitle: z.string().nullable(),
      heroSubtitle: z.string().nullable(),
      aboutText: z.string().nullable(),
      primaryColor: z.string().nullable(),
      logoUrl: z.string().nullable(),
      faviconUrl: z.string().nullable(),
      footerText: z.string().nullable(),
    })
    .nullable(),
  logoFile: z.instanceof(File).optional().nullable(),
  faviconFile: z.instanceof(File).optional().nullable(),
});

export type BusinessBrandingFormSchema = z.infer<
  typeof businessBrandingFormSchema
>;

export const updateBrandingSchema = z.object({
  templateId: z.string(),
  siteContent: z.object({
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    aboutText: z.string().optional(),
    primaryColor: z.string().optional(),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    footerText: z.string().optional(),
  }),
});
