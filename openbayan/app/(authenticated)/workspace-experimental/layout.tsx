import type { ReactNode } from "react"

export default function WorkspaceExperimentalLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}
