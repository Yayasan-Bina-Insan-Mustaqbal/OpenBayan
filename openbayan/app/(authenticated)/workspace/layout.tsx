import type { ReactNode } from "react"
import { HeroBackground } from "@/components/hero-background"

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  // Full-screen shell, no standard top-nav or scrolling
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 opacity-40">
        <HeroBackground />
      </div>
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}
