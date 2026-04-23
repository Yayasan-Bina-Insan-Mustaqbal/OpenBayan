import { getServerSession } from "next-auth"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { DashboardWorkspace } from "@/components/dashboard-workspace"

export default async function Page() {
  const session = await getServerSession(authOptions)

  return <DashboardWorkspace user={session?.user} />
}
