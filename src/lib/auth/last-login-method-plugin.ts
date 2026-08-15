import type { LastLoginMethodPluginOptions } from "@better-auth-ui/core/plugins";
import { createAuthPlugin } from "@better-auth-ui/core";
import { lastLoginMethodPlugin as coreLastLoginMethodPlugin } from "@better-auth-ui/core/plugins";

export const lastLoginMethodPlugin = createAuthPlugin(
  coreLastLoginMethodPlugin.id,
  (options: LastLoginMethodPluginOptions = {}) => ({
    ...coreLastLoginMethodPlugin(options),
  }),
);
