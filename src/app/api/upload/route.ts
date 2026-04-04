import crypto from "crypto";
import type { Router } from "@better-upload/server";
import { RejectUpload, route } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";

import { env } from "~/env";
import { checkBusiness } from "~/lib/check-business";
import { s3Client } from "~/lib/s3/client";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

const router: Router = {
  client: s3Client,
  bucketName: env.NEXT_PUBLIC_STORAGE_BUCKET_NAME,
  routes: {
    image: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      onBeforeUpload: async ({ req, file }) => {
        const user = await auth.api.getSession({ headers: req.headers });
        if (!user) {
          throw new RejectUpload("Not logged in!");
        }
        const business = await checkBusiness();
        if (!business) {
          throw new RejectUpload("Business not found!");
        }

        return {
          objectInfo: {
            key: `${business.id}/${file.name}`,
            metadata: {
              pathname: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${business.id}/${file.name}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        // the files now have the objectInfo property

        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    video: route({
      fileTypes: ["video/*"],
      multipleFiles: false,
      maxFileSize: 1024 * 1024 * 20, // 20MB
      onBeforeUpload: async ({ req, file }) => {
        const user = await auth.api.getSession({ headers: req.headers });
        if (!user) {
          throw new RejectUpload("Not logged in!");
        }
        const business = await checkBusiness();
        if (!business) {
          throw new RejectUpload("Business not found!");
        }

        return {
          objectInfo: {
            key: `${business.id}/${file.name}`,
            metadata: {
              pathname: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${business.id}/${file.name}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    logo: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      onBeforeUpload: async ({ req, file }) => {
        const user = await auth.api.getSession({ headers: req.headers });
        if (!user) {
          throw new RejectUpload("Not logged in!");
        }
        const business = await checkBusiness();
        if (!business) {
          throw new RejectUpload("Business not found!");
        }

        return {
          objectInfo: {
            key: `${business.id}/logo.${file.name.split(".")[1]}`,
            metadata: {
              pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${business.id}/logo.${file.name.split(".")[1]}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        // the files now have the objectInfo property
        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    favicon: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      onBeforeUpload: async ({ req, file }) => {
        const user = await auth.api.getSession({ headers: req.headers });
        if (!user) {
          throw new RejectUpload("Not logged in!");
        }
        const business = await checkBusiness();
        if (!business) {
          throw new RejectUpload("Business not found!");
        }
        return {
          objectInfo: {
            key: `${business.id}/favicon.${file.name.split(".")[1]}`,
            metadata: {
              pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${business.id}/favicon.${file.name.split(".")[1]}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        // the files now have the objectInfo property
        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    images: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 10,
      maxFileSize: 1024 * 1024 * 5, // 5MB

      onBeforeUpload: async ({ req }) => {
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
    testimonials: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 5,
      onBeforeUpload: async ({ req, clientMetadata }) => {
        const code = (clientMetadata as { code?: string } | undefined)?.code;
        let businessId: string;

        if (code) {
          const invite = await db.testimonialInvite.findUnique({
            where: { code },
            select: { businessId: true, used: true, expiresAt: true },
          });
          if (!invite) {
            throw new RejectUpload("Invalid invite code");
          }
          if (invite.used) {
            throw new RejectUpload("This invite has already been used");
          }
          if (new Date() > invite.expiresAt) {
            throw new RejectUpload("This invite has expired");
          }
          businessId = invite.businessId;
        } else {
          const user = await auth.api.getSession({ headers: req.headers });
          if (!user) {
            throw new RejectUpload("Not logged in!");
          }
          const business = await checkBusiness();
          if (!business) {
            throw new RejectUpload("Business not found!");
          }
          businessId = business.id;
        }

        return {
          generateObjectInfo: ({ file }) => {
            const ext = file.name.includes(".")
              ? file.name.slice(file.name.lastIndexOf("."))
              : "";
            const uniqueName = `${crypto.randomBytes(8).toString("hex")}${ext}`;
            const key = `${businessId}/testimonials/${uniqueName}`;
            const pathName = `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`;
            return {
              key,
              metadata: { pathName },
            };
          },
        };
      },
    }),
  },
};
export const { POST } = toRouteHandler(router);
