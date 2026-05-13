import { querySurreal } from "@/lib/surreal-query"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { sql } = await request.json()
    if (!sql) {
      return NextResponse.json({ error: "Missing SQL query" }, { status: 400 })
    }

    const res = await querySurreal(sql)
    return NextResponse.json(res)
  } catch (error: any) {
    console.error("API Query Proxy Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
