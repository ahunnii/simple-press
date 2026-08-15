import type { DeleteUserPluginOptions } from "@better-auth-ui/core/plugins";
import { createAuthPlugin } from "@better-auth-ui/core";
import { deleteUserPlugin as coreDeleteUserPlugin } from "@better-auth-ui/core/plugins";

import { DangerZone } from "~/components/auth/delete-user/danger-zone";

export const deleteUserPlugin = createAuthPlugin(
  coreDeleteUserPlugin.id,
  (options: DeleteUserPluginOptions = {}) => ({
    ...coreDeleteUserPlugin(options),
    securityCards: [DangerZone],
  }),
);
