"use client"

import * as React from "react"
import { signOut } from "next-auth/react"

import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
      <DropdownMenuContent align="end" className="w-48">
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
          <DropdownMenuItem
            className="flex cursor-default items-center justify-between"
            onSelect={(event) => event.preventDefault()}
          >
            Theme
            <ThemeToggle />
          </DropdownMenuItem>
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
