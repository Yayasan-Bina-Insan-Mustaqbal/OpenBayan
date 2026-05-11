const surrealUrl = process.env.SURREAL_HTTP_URL ?? "http://localhost:8000"
const surrealNamespace = process.env.SURREAL_NAMESPACE ?? "openbayan"
const surrealDatabase = process.env.SURREAL_DATABASE ?? "openbayan"
const surrealAccess = process.env.SURREAL_ACCESS ?? "account"

type AuthResponse = {
  token: string
  user: {
    id: string
    email: string
    name?: string | null
  }
}

export async function signinWithSurreal({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const token = await surrealAuthRequest("/signin", { email, password })

  return buildAuthResponse(token, email)
}

export async function signupWithSurreal({
  name,
  email,
  password,
}: {
  name: string
  email: string
  password: string
}) {
  const token = await surrealAuthRequest("/signup", {
    name,
    username: buildUsername(name, email),
    email,
    password,
  })

  return buildAuthResponse(token, email, name)
}

async function surrealAuthRequest(
  path: "/signin" | "/signup",
  variables: Record<string, string>
) {
  let response: Response

  try {
    response = await fetch(`${surrealUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        NS: surrealNamespace,
        DB: surrealDatabase,
        AC: surrealAccess,
        ...variables,
      }),
      cache: "no-store",
    })
  } catch {
    throw new Error(`Cannot reach SurrealDB at ${surrealUrl}.`)
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof payload?.description === "string"
        ? payload.description
        : typeof payload?.information === "string"
          ? payload.information
          : "Authentication failed."

    throw new Error(message)
  }

  const token = extractToken(payload)

  if (!token) {
    throw new Error("SurrealDB did not return an authentication token.")
  }

  return token
}

function extractToken(payload: unknown) {
  if (typeof payload === "string") {
    return payload
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>

    if (typeof record.token === "string") {
      return record.token
    }

    if (typeof record.result === "string") {
      return record.result
    }
  }

  return null
}

function buildAuthResponse(token: string, email: string, name?: string): AuthResponse {
  const claims = decodeJwtClaims(token)
  const id =
    typeof claims?.ID === "string"
      ? claims.ID
      : typeof claims?.id === "string"
        ? claims.id
        : email

  return {
    token,
    user: {
      id,
      email,
      name: name ?? null,
    },
  }
}

function buildUsername(name: string, email: string) {
  const base =
    name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ||
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ||
    "user"
  const suffix = Math.abs(hashString(email)).toString(36)

  return `${base}${suffix}`
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return hash
}

function decodeJwtClaims(token: string) {
  const [, encodedPayload] = token.split(".")

  if (!encodedPayload) {
    return null
  }

  try {
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>
  } catch {
    return null
  }
}
