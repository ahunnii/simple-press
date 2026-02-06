import { route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { env } from "~/env";
import { s3Client } from "~/lib/s3/s3-client";

const router: Router = {
  client: s3Client,
  bucketName: env.NEXT_PUBLIC_STORAGE_BUCKET_NAME,
  routes: {
    logo: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
    }),
    image: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
    }),
    eventMedia: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
    }),
    gallery: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
    }),
    leader: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
    }),
    resource: route({
      fileTypes: [
        "image/*",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      multipleFiles: false,
    }),
  },
};
export const { POST } = toRouteHandler(router);
