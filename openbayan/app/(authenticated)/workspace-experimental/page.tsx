import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { WorkspaceExperimentalShellClient } from "@/components/workspace-experimental-shell-client"

export default async function WorkspaceExperimentalPage() {
  const session = await getServerSession(authOptions)

  return <WorkspaceExperimentalShellClient user={session?.user} />
}
