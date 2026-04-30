"use client"

import { WorkspaceShell } from "@/components/workspace-shell"
import * as React from "react"

export function WorkspaceShellClient({ user }: { user: any }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <WorkspaceShell user={user} />
}
