import type { ReactNode } from "react"
import { HeroBackground } from "@/components/landing/hero-background"

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  // Full-screen shell, no standard top-nav or scrolling
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}
