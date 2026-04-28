import type { ReactNode } from "react"

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  // Full-screen shell, no standard top-nav or scrolling
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  )
}
