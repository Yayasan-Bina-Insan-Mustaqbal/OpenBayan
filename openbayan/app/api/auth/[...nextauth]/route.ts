import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { signinWithSurreal } from "@/lib/surreal-auth"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "SurrealDB",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim()
        const password = credentials?.password

        if (!email || !password) {
          return null
        }

        const auth = await signinWithSurreal({ email, password })

        return {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name ?? auth.user.email,
          surrealToken: auth.token,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.surrealToken = user.surrealToken
        token.userId = user.id
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.surrealToken = token.surrealToken
      }

      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
