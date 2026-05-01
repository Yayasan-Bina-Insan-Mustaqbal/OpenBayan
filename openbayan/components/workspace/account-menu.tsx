"use client"

import {
  IconCheck,
  IconCircleFilled,
  IconContrast,
  IconDeviceDesktop,
  IconMoon,
  IconMoonStars,
  IconPalette,
  IconSun,
} from "@tabler/icons-react"
import { signOut } from "next-auth/react"

import { Color, Theme, useTheme } from "@/components/shared/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type AccountUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type AccountMenuProps = {
  user?: AccountUser | null
}

function getInitials(user?: AccountUser | null) {
  const source = user?.name || user?.email || "OpenBayan"
  const parts = source
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) {
    return "OB"
  }

  return parts.map((part) => part[0]).join("").toUpperCase()
}

export function AccountMenu({ user }: AccountMenuProps) {
  const displayName = user?.name || "OpenBayan"
  const email = user?.email || "Not signed in"
  const { theme, color, setTheme, setColor } = useTheme()

  const appearanceOptions: { label: string; value: Theme; icon: React.ElementType }[] = [
    { label: "System", value: "system", icon: IconDeviceDesktop },
    { label: "Light", value: "light", icon: IconSun },
    { label: "Dark", value: "dark", icon: IconMoon },
    { label: "Midnight", value: "midnight", icon: IconMoonStars },
  ]

  const colorOptions: { label: string; value: Color; hex: string }[] = [
    { label: "Emerald", value: "emerald", hex: "#10b981" },
    { label: "Blue", value: "blue", hex: "#3b82f6" },
    { label: "Rose", value: "rose", hex: "#f43f5e" },
    { label: "Amber", value: "amber", hex: "#f59e0b" },
  ]

  const accessibilityOptions: { label: string; value: Theme; icon: React.ElementType }[] = [
    { label: "High Contrast (L)", value: "hc-light", icon: IconContrast },
    { label: "High Contrast (D)", value: "hc-dark", icon: IconContrast },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full transition-transform duration-200 ease-out hover:scale-105 active:scale-95 data-[state=open]:scale-105"
          aria-label="Open account menu"
        >
          <Avatar>
            {user?.image ? (
              <AvatarImage src={user.image} alt={displayName} />
            ) : null}
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <div className="px-2 py-1.5">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{email}</div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <IconPalette data-icon="inline-start" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Appearance</div>
                {appearanceOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onSelect={() => setTheme(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <opt.icon className="size-4" />
                      <span>{opt.label}</span>
                    </div>
                    {theme === opt.value && <IconCheck className="size-4" />}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Colors</div>
                <div className="grid grid-cols-4 gap-2 p-2" role="group" aria-label="Select accent color">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setColor(opt.value)}
                      aria-label={`Set accent color to ${opt.label}`}
                      aria-pressed={color === opt.value}
                      className={cn(
                        "group relative flex size-8 items-center justify-center rounded-full border-2 transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        color === opt.value ? "border-primary shadow-sm" : "border-transparent"
                      )}
                    >
                      <span 
                        className="size-full rounded-full border shadow-inner" 
                        style={{ backgroundColor: opt.hex }} 
                      />
                      {color === opt.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <IconCheck className="size-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Accessibility</div>
                {accessibilityOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onSelect={() => setTheme(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <opt.icon className="size-4" />
                      <span>{opt.label}</span>
                    </div>
                    {theme === opt.value && <IconCheck className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => signOut({ callbackUrl: "/" })}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
