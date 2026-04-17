import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

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
import { featuresRouter } from "./routers/featues";
import { galleryRouter } from "./routers/gallery";
import { importRouter } from "./routers/import";
import { inventoryRouter } from "./routers/inventory";
import { orderRouter } from "./routers/order";
import { platformRouter } from "./routers/platform";
import { productRouter } from "./routers/product";
import { reviewRouter } from "./routers/review";
import { testimonialRouter } from "./routers/testimonials";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
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
  testimonial: testimonialRouter,

  features: featuresRouter,
  review: reviewRouter,

  platform: platformRouter,
  contact: contactRouter,

  external: externalRouter,
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
