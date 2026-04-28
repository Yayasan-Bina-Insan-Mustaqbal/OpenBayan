import Link from "next/link"
import { IconPlus } from "@tabler/icons-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AccountMenu } from "@/components/account-menu"

type AccountUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export function DashboardTopNav({ user }: { user?: AccountUser | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* <SidebarTrigger className="-ml-1" /> */}
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <span className="hidden sm:inline-block">OpenBayan</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/workspace?new=sahifah"
            className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <IconPlus className="size-4" />
            <span className="hidden sm:inline-block">New Sahifah</span>
          </Link>
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  )
}
