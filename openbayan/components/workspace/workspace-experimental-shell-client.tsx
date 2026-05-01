"use client"

import { WorkspaceExperimentalShell } from "@/components/workspace/workspace-experimental-shell"
import * as React from "react"

export function WorkspaceExperimentalShellClient({ user }: { user: any }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <WorkspaceExperimentalShell user={user} />
}
