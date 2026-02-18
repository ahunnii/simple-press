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

export type DefaultCartPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
};

export type DefaultCheckoutPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGetWithProducts"]>;
};
