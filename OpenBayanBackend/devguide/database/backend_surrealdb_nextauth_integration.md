# SurrealDB & NextAuth Integration

OpenBayan no longer needs a separate Python API gateway. SurrealDB is the application backend for records, permissions, auth tokens, graph queries, full-text search, and vector search. Next.js owns the web boundary: UI, server routes, server actions, and NextAuth session handling.

## 1. Authentication Flow

1. The user signs up or signs in through a Next.js route or NextAuth credentials provider.
2. The server-side auth helper calls SurrealDB's HTTP `/signup` or `/signin` endpoint with the configured record access method.
3. SurrealDB validates the credentials and returns a record token.
4. NextAuth stores that SurrealDB token in its JWT session.
5. Server-side Next.js code uses the token when it needs to query SurrealDB as the logged-in record user.

The browser should not receive root credentials. For private data, prefer server-side queries through Next.js route handlers or server actions. Browser-side direct SurrealDB access is only acceptable when the token is scoped and the queried tables have strict record permissions.

## 2. SurrealDB Record Access

Define record access in SurrealDB and keep user creation inside the database:

```surrealql
USE NS openbayan DB openbayan;

DEFINE TABLE IF NOT EXISTS user SCHEMAFULL
  PERMISSIONS
    FOR select, update, delete WHERE id = $auth.id,
    FOR create NONE;

DEFINE FIELD IF NOT EXISTS email ON TABLE user TYPE string ASSERT string::is_email($value);
DEFINE FIELD IF NOT EXISTS name ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS username ON TABLE user TYPE string ASSERT string::is_alphanum($value);
DEFINE FIELD IF NOT EXISTS password ON TABLE user TYPE string;
DEFINE FIELD IF NOT EXISTS role ON TABLE user TYPE string DEFAULT "user"
  ASSERT $value IN ["user", "admin"];
DEFINE FIELD IF NOT EXISTS created_at ON TABLE user TYPE datetime DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS user_email ON TABLE user FIELDS email UNIQUE;

DEFINE ACCESS OVERWRITE account ON DATABASE TYPE RECORD
  SIGNUP (
    CREATE user CONTENT {
      email: $email,
      name: $name,
      username: $username,
      password: crypto::argon2::generate($password),
      role: "user"
    }
  )
  SIGNIN (
    SELECT * FROM user
    WHERE email = $email AND crypto::argon2::compare(password, $password)
  )
  DURATION FOR SESSION 24h;
```

## 3. Next.js Server Helper

Keep SurrealDB calls in server-only modules:

```ts
// openbayan/lib/surreal-auth.ts
import "server-only";

const url = process.env.SURREAL_HTTP_URL ?? "http://host.docker.internal:8000";
const namespace = process.env.SURREAL_NAMESPACE ?? "openbayan";
const database = process.env.SURREAL_DATABASE ?? "openbayan";
const access = process.env.SURREAL_ACCESS ?? "account";

type AuthInput = {
  email: string;
  password: string;
  name?: string;
  username?: string;
};

async function postAuth(path: "/signup" | "/signin", body: AuthInput) {
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      NS: namespace,
      DB: database,
      AC: access,
      ...body,
    }),
  });

  if (!response.ok) {
    throw new Error(`SurrealDB ${path} failed: ${response.status}`);
  }

  return response.json();
}

export function signupWithSurreal(input: AuthInput) {
  return postAuth("/signup", input);
}

export function signinWithSurreal(input: AuthInput) {
  return postAuth("/signin", input);
}
```

## 4. Querying as the Logged-In User

Use the SurrealDB token from the NextAuth session for record-permission-aware queries:

```ts
// openbayan/lib/surreal-query.ts
import "server-only";

export async function surrealQuery<T>(token: string, sql: string): Promise<T> {
  const response = await fetch(`${process.env.SURREAL_HTTP_URL}/sql`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Surreal-NS": process.env.SURREAL_NAMESPACE ?? "openbayan",
      "Surreal-DB": process.env.SURREAL_DATABASE ?? "openbayan",
      "Authorization": `Bearer ${token}`,
    },
    body: sql,
  });

  if (!response.ok) {
    throw new Error(`SurrealDB query failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

For user-provided values, serialize literals with `JSON.stringify` before embedding them in SurrealQL, or use an SDK client that supports bound variables.

Every private table should enforce ownership using `$auth.id`, for example:

```surrealql
DEFINE TABLE IF NOT EXISTS faidah SCHEMAFULL
  PERMISSIONS
    FOR select WHERE owner = $auth.id OR is_public = true,
    FOR create WHERE $auth.id != NONE,
    FOR update, delete WHERE owner = $auth.id;
```

## 5. Admin and Worker Access

Use root credentials only from trusted containers:

- schema setup scripts
- Prefect ingestion workers
- Jupyter notebooks used for data work
- one-off admin maintenance jobs

Do not expose `SURREAL_USER` or `SURREAL_PASS` to browser bundles. Variables prefixed with `NEXT_PUBLIC_` or `VITE_` are public.
