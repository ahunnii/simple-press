import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const videosHeroData: TemplateField[] = [
  {
    key: "default.videos.hero-eyebrow",
    label: "Small label",
    description:
      "Short text above the page heading on the Videos page. Leave blank to hide.",
    type: "text",
    page: "videos",
    group: "videos.hero",
    defaultValue: "Watch",
    placeholder: "Watch",
  },
  {
    key: "default.videos.hero-heading",
    label: "Heading",
    description: "Main heading at the top of the Videos page.",
    type: "text",
    page: "videos",
    group: "videos.hero",
    gridColumn: "col-span-full",
    defaultValue: "Videos",
    placeholder: "Videos",
  },
  {
    key: "default.videos.hero-tagline",
    label: "Intro text",
    description: "Short line below the heading. Leave blank to hide.",
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
    label: "Empty state heading",
    description: "Heading shown on the Videos page when there are no published videos.",
    type: "text",
    page: "videos",
    group: "videos.list",
    defaultValue: "No videos yet",
    placeholder: "No videos yet",
  },
  {
    key: "default.videos.list-empty-body",
    label: "Empty state message",
    description:
      "Line below the empty-state heading when there are no published videos. Leave blank to hide.",
    type: "textarea",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-full",
    defaultValue: "Check back soon — new videos are posted here.",
    placeholder: "One short sentence",
  },
];

export const defaultVideosData: TemplateField[] = [
  ...videosHeroData,
  ...videosListData,
];

export const defaultVideosFieldGroups: TemplateFieldGroup[] = [
  {
    id: "videos.hero",
    title: "Hero",
    description: "Page heading and intro text.",
    icon: "📺",
    columns: 2,
  },
  {
    id: "videos.list",
    title: "List",
    description: "Empty-state copy.",
    icon: "🎬",
    columns: 2,
  },
];
