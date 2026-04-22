import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: unknown
      surrealToken?: unknown
    }
  }

  interface User {
    surrealToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: unknown
    surrealToken?: unknown
  }
}
