"use client"

import dynamic from "next/dynamic"

// Use dynamic import for the workspace shell to avoid SSR hydration issues
// Moving this to a Client Component allows ssr: false
const DashboardWorkspace = dynamic(
  () => import("@/components/dashboard-workspace").then(mod => mod.DashboardWorkspace),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading workspace...</p>
        </div>
      </div>
    )
  }
)

export function WorkspaceShellClient({ user }: { user: any }) {
  return <DashboardWorkspace user={user} />
}
