import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const videosHeroData: TemplateField[] = [
  {
    key: "default.videos.hero-eyebrow",
    label: "Hero Eyebrow",
    description: "Small label above the page heading",
    type: "text",
    page: "videos",
    group: "videos.hero",
    defaultValue: "Watch",
    placeholder: "Watch",
  },
  {
    key: "default.videos.hero-heading",
    label: "Hero Heading",
    description: "Main heading for the Videos page",
    type: "text",
    page: "videos",
    group: "videos.hero",
    gridColumn: "col-span-full",
    defaultValue: "Videos",
    placeholder: "Videos",
  },
  {
    key: "default.videos.hero-tagline",
    label: "Hero Tagline",
    description: "Short line below the heading",
    type: "textarea",
    page: "videos",
    group: "videos.hero",
    gridColumn: "col-span-full",
    defaultValue: "Behind the scenes, tutorials, and more.",
    placeholder: "Behind the scenes, tutorials, and more.",
  },
];

const videosListData: TemplateField[] = [
  {
    key: "default.videos.list-empty-heading",
    label: "Empty Heading",
    description: "Heading shown when there are no published videos",
    type: "text",
    page: "videos",
    group: "videos.list",
    defaultValue: "No videos yet",
    placeholder: "No videos yet",
  },
  {
    key: "default.videos.list-empty-body",
    label: "Empty Body",
    description: "Supporting copy shown below the empty-state heading",
    type: "textarea",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-full",
    defaultValue: "Check back soon — new videos are posted here.",
    placeholder: "Check back soon — new videos are posted here.",
  },
];

export const defaultVideosData: TemplateField[] = [
  ...videosHeroData,
  ...videosListData,
];

export const defaultVideosFieldGroups: TemplateFieldGroup[] = [
  {
    id: "videos.hero",
    title: "Videos — Hero",
    description: "Page heading and tagline",
    icon: "📺",
    columns: 2,
  },
  {
    id: "videos.list",
    title: "Videos — List",
    description: "Empty-state copy",
    icon: "🎬",
    columns: 2,
  },
];
