import { NextResponse } from "next/server"

import { signupWithSurreal } from "@/lib/surreal-auth"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string
    email?: string
    password?: string
  } | null

  const name = body?.name?.trim()
  const email = body?.email?.trim()
  const password = body?.password

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    )
  }

  try {
    const auth = await signupWithSurreal({ name, email, password })

    return NextResponse.json({ user: auth.user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account."

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
