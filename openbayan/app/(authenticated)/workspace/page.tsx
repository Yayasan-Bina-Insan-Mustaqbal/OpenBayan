import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { WorkspaceShellClient } from "@/components/workspace-shell-client"

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions)

  return <WorkspaceShellClient user={session?.user} />
}
