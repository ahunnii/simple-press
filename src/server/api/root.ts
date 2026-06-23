import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { analyticsRouter } from "./routers/analytics";
import { baseInventoryUnitRouter } from "./routers/base-inventory-unit";
import { businessRouter } from "./routers/business";
import { collectionsRouter } from "./routers/collections";
import { contactRouter } from "./routers/contact";
import { contentRouter } from "./routers/content";
import { customerRouter } from "./routers/customer";
import { discountRouter } from "./routers/discount";
import { domainRouter } from "./routers/domain";
import { exportRouter } from "./routers/export";
import { externalRouter } from "./routers/external";
import { faqRouter } from "./routers/faq";
import { featuresRouter } from "./routers/featues";
import { galleryRouter } from "./routers/gallery";
import { mediaRouter } from "./routers/media";
import { importRouter } from "./routers/import";
import { inventoryRouter } from "./routers/inventory";
import { orderRouter } from "./routers/order";
import { platformRouter } from "./routers/platform";
import { productRouter } from "./routers/product";
import { reviewRouter } from "./routers/review";
import { serviceRouter } from "./routers/service";
import { shippingRouter } from "./routers/shipping";
import { testimonialRouter } from "./routers/testimonials";
import { uploadRouter } from "./routers/upload";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  baseInventoryUnit: baseInventoryUnitRouter,
  domain: domainRouter,
  discount: discountRouter,
  export: exportRouter,

  business: businessRouter,
  product: productRouter,
  order: orderRouter,
  customer: customerRouter,
  inventory: inventoryRouter,
  collections: collectionsRouter,
  content: contentRouter,

  import: importRouter,
  gallery: galleryRouter,
  media: mediaRouter,
  testimonial: testimonialRouter,

  features: featuresRouter,
  review: reviewRouter,
  services: serviceRouter,

  platform: platformRouter,
  contact: contactRouter,
  shipping: shippingRouter,

  external: externalRouter,
  faq: faqRouter,

  upload: uploadRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
