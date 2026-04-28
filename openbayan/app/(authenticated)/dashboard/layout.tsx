import type { ReactNode } from "react"
import { getServerSession } from "next-auth"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { DashboardTopNav } from "@/components/dashboard-topnav"
import { HeroBackground } from "@/components/hero-background"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <SidebarProvider>
      {/* TODO: Add AppSidebar */}
      <div className="relative flex min-h-screen w-full flex-col bg-muted/15">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <HeroBackground />
        </div>
        <div className="relative z-10 flex min-h-screen w-full flex-col">
          <DashboardTopNav user={session?.user} />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
