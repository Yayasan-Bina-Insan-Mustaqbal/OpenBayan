import type { ReactNode } from "react"
import { getServerSession } from "next-auth"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardTopNav } from "@/components/dashboard-topnav"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <SidebarProvider>
      {/* TODO: Add AppSidebar */}
      <div className="flex min-h-screen w-full flex-col">
        <DashboardTopNav user={session?.user} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
