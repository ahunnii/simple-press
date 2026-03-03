import { inferAdditionalFields } from "better-auth/client/plugins";
import { captcha, organization } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./config";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), organization()],
});

export type Session = typeof authClient.$Infer.Session;
