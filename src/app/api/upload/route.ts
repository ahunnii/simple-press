import { RejectUpload, route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { env } from "~/env";
import { checkBusiness } from "~/lib/check-business";
import { s3Client } from "~/lib/s3/s3-client";
import { auth } from "~/server/better-auth";

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

      multipleFiles: true,
      maxFiles: 10,
      onBeforeUpload: async ({ req, files, clientMetadata }) => {
        const user = await auth.api.getSession({ headers: req.headers });
        if (!user) {
          throw new RejectUpload("Not logged in!");
        }

        const business = await checkBusiness();

        if (!business) {
          throw new RejectUpload("Business not found!");
        }

        return {
          generateObjectInfo: ({ file }) => {
            const key = `${business.id}/${file.name}`;

            return {
              key,
              metadata: {
                pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${business.id}/${file.name}`,
              },
            };
          },
        };
      },
    }),
  },
};
export const { POST } = toRouteHandler(router);
