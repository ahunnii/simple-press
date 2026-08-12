import { type LucideIcon } from "lucide-react";

export type EditorAdminLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
  featureKey?: string;
};

export const EDITOR_ADMIN_LINKS: EditorAdminLink[] = [
  {
    label: "Navigation menu",
    href: "/admin/content/navigation",
  },
  {
    label: "Logo & brand",
    href: "/admin/content/branding",
  },
];
