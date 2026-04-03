import type { Session } from "~/server/better-auth/config";
import type { RouterOutputs } from "~/trpc/react";

export type DefaultHomepageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
};

export type DefaultLayoutTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
  children: React.ReactNode;
};

export type DefaultHeaderTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
  session?: Session | null;
};

export type DefaultFooterTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
};

export type DefaultProductsPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["getWithProducts"]>;
};

export type DefaultProductPageTemplateProps = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export type DefaultContactPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export type DefaultAboutPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export type DefaultCollectionsPageTemplateProps = {
  collections: RouterOutputs["collections"]["getAllPublic"];
};

export type DefaultCollectionPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  collection: NonNullable<RouterOutputs["collections"]["getBySlug"]>;
  additionalCollections: RouterOutputs["collections"]["getAllPublic"];
};

export type DefaultTestimonialsPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export type DefaultCartPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
};

export type DefaultCheckoutPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
};

export type DefaultBlogPostPageTemplateProps = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
  relatedPosts: NonNullable<RouterOutputs["content"]["getBlogPages"]>;
};

export type DefaultBlogPageTemplateProps = {
  pages: NonNullable<RouterOutputs["content"]["getBlogPages"]>;
};
