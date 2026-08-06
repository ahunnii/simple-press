"use client"

import {
  type MultiSessionAuthClient,
  useAuth,
  useSession,
  useSetActiveSession
} from "@better-auth-ui/react"
import {
  ChevronsUpDown,
  LogIn,
  LogOut,
  Settings,
  UserPlus2
} from "lucide-react"
import { isValidElement, type ReactElement, type ReactNode } from "react"

import { buttonVariants } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu"
import { cn } from "~/lib/utils"
import { UserAvatar } from "./user-avatar"
import { UserView } from "./user-view"

/** Auth states a `UserButton` link can be visible in. */
export type UserButtonLinkVisibility =
  | "authenticated"
  | "unauthenticated"
  | "always"

/** A simple link entry rendered as a `DropdownMenuItem` in the `UserButton` menu. */
export type UserButtonLink = {
  /** Visible label. */
  label: ReactNode
  /** Destination URL. */
  href: string
  /** Optional leading icon. Sized/coloured to match built-in items. */
  icon?: ReactNode
  /** Forwarded to the underlying `DropdownMenuItem`. */
  variant?: "default" | "destructive"
  /**
   * When this link is visible based on auth state.
   * @default "always"
   */
  visibility?: UserButtonLinkVisibility
}

export type UserButtonProps = {
  className?: string
  align?: "center" | "end" | "start" | undefined
  sideOffset?: number
  size?: "default" | "icon"
  variant?:
    | "default"
    | "destructive"
    | "ghost"
    | "link"
    | "outline"
    | "secondary"
  /** Additional menu entries rendered above the built-in items. */
  links?: (UserButtonLink | ReactElement)[]
  /** Hide the built-in "Settings" link. Useful when replacing it via `links`. */
  hideSettings?: boolean
  /**
   * SIMPLEPRESS LOCAL ADDITION — re-apply after re-fetching this file from the
   * Better Auth UI registry.
   *
   * Classes for the avatar itself, as distinct from `className` (the trigger).
   * Upstream has no equivalent: it styles only the trigger, so the avatar's
   * size and ring are fixed. SimplePress templates each brand the avatar
   * differently — pink and vii use per-template ring colours, sledge and noise
   * use borders, and sizes vary from `size-7` to `size-10` — which the legacy
   * `@daveyplate/better-auth-ui` supported via
   * `classNames.trigger.avatar.base`.
   *
   * Kept as one flat prop rather than reviving the old nested `classNames`
   * object: it's the only piece with no upstream home, and a flat prop is far
   * easier to re-apply on upgrade.
   */
  avatarClassName?: string
}

function renderUserLink(
  link: UserButtonLink | ReactElement,
  navigate: (options: { to: string; replace?: boolean }) => void,
  fallbackKey: string
): ReactNode {
  if (isValidElement(link)) return link

  const { label, href, icon, variant } = link
  return (
    <DropdownMenuItem
      key={fallbackKey}
      variant={variant}
      onClick={() => navigate({ to: href })}
    >
      {icon}
      {label}
    </DropdownMenuItem>
  )
}

/**
 * Render a user dropdown button that shows user info, settings, theme controls, and authentication actions.
 *
 * Includes user profile, settings link, optional multi-session account switching, theme picker,
 * and sign-in/sign-up/sign-out actions depending on authentication state.
 *
 * @param className - Additional CSS classes applied to the button trigger
 * @param align - Alignment of the dropdown menu relative to the trigger
 * @param sideOffset - Offset between the trigger and the dropdown menu
 * @param size - "icon" renders only the avatar; "default" renders a full button with label and chevron
 * @param variant - Visual variant of the trigger button
 * @param links - Additional menu entries rendered above the built-in items
 * @param hideSettings - Hide the built-in "Settings" link
 * @returns The dropdown menu component with user actions
 */
export function UserButton({
  className,
  align,
  sideOffset,
  size = "default",
  variant = "ghost",
  links,
  hideSettings = false,
  // SIMPLEPRESS LOCAL ADDITION — see UserButtonProps.
  avatarClassName
}: UserButtonProps) {
  const { authClient, basePaths, viewPaths, localization, plugins, navigate } =
    useAuth()

  const { isPending: settingActiveSession } = useSetActiveSession(
    authClient as MultiSessionAuthClient
  )
  const { data: session, isPending: sessionPending } = useSession(authClient)

  const userLinks = links?.flatMap((link, index) => {
    if (!isValidElement(link)) {
      const visibility = link.visibility ?? "always"
      if (visibility === "authenticated" && !session) return []
      if (visibility === "unauthenticated" && session) return []
    }
    return [
      renderUserLink(link, navigate, `user-button-link-${index.toString()}`)
    ]
  })

  // Whether anything renders between the user info label and the
  // sign-out item, so the leading separator isn't shown with nothing
  // to separate (see #439).
  const hasSessionMenuItems =
    (userLinks?.length ?? 0) > 0 ||
    !hideSettings ||
    plugins.some((plugin) => (plugin.userMenuItems?.length ?? 0) > 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={size === "icon" ? localization.auth.account : undefined}
        className={
          size === "icon"
            ? cn("rounded-full", className)
            : cn(
                buttonVariants({ variant, size: "lg" }),
                "py-2.5 h-auto font-normal",
                className
              )
        }
      >
        {size === "icon" ? (
          <UserAvatar className={avatarClassName} />
        ) : (
          <>
            {session || sessionPending || settingActiveSession ? (
              <UserView isPending={!!settingActiveSession} />
            ) : (
              <>
                <UserAvatar className={avatarClassName} />

                <div className="grid flex-1 text-left text-sm leading-tight">
                  {localization.auth.account}
                </div>
              </>
            )}

            <ChevronsUpDown className="ml-auto size-4" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-40 md:min-w-56 max-w-[48svw]"
        sideOffset={sideOffset}
        align={align}
      >
        {session && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-sm font-normal">
                <UserView />
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            {hasSessionMenuItems && <DropdownMenuSeparator />}
          </>
        )}

        {session ? (
          <>
            {userLinks}

            {!hideSettings && (
              <DropdownMenuItem
                onClick={() =>
                  navigate({
                    to: `${basePaths.settings}/${viewPaths.settings.account}`
                  })
                }
              >
                <Settings className="text-muted-foreground" />

                {localization.settings.settings}
              </DropdownMenuItem>
            )}

            {plugins.flatMap((plugin) =>
              plugin.userMenuItems?.map((Item, index) => (
                <Item key={`${plugin.id}-${index.toString()}`} />
              ))
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: `${basePaths.auth}/${viewPaths.auth.signOut}`
                })
              }
            >
              <LogOut className="text-muted-foreground" />

              {localization.auth.signOut}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {userLinks}

            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: `${basePaths.auth}/${viewPaths.auth.signIn}`
                })
              }
            >
              <LogIn className="text-muted-foreground" />

              {localization.auth.signIn}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: `${basePaths.auth}/${viewPaths.auth.signUp}`
                })
              }
            >
              <UserPlus2 className="text-muted-foreground" />

              {localization.auth.signUp}
            </DropdownMenuItem>

            {plugins.flatMap((plugin) =>
              plugin.userMenuItems?.map((Item, index) => (
                <Item key={`${plugin.id}-${index.toString()}`} />
              ))
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
