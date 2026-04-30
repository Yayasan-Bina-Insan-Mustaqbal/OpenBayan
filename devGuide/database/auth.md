# SurrealDB Auth Guide

OpenBayan uses SurrealDB record access for user registration and login. The Next.js app does not connect to SurrealDB directly from the browser. Instead, NextAuth runs server-side and calls SurrealDB's HTTP `/signup` and `/signin` endpoints.

## Local Services

SurrealDB is defined in `OpenBayanBackend/docker-compose.yml`.

```yaml
surrealdb:
  image: surrealdb/surrealdb:latest
  container_name: bayan_surrealdb
  ports:
    - "8000:8000"
  command: start --log trace --user root --pass root surrealkv:/data/database.db
```

Local endpoints:

```text
HTTP API: http://localhost:8000
WebSocket RPC: ws://localhost:8000/rpc
Namespace: main
Database: main
Root user: root
Root pass: root
Record access: account
```

## Setup

Start the backend stack:

```bash
cd OpenBayanBackend
docker compose up -d surrealdb
```

Apply the schema:

```bash
./apply_schema.sh
```

The schema script applies `OpenBayanBackend/schema/init.surql` to namespace `main` and database `main`.

## Frontend Environment

The Next.js app reads these values from `openbayan/.env.local`:

```dotenv
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=http://localhost:3000

SURREAL_HTTP_URL=http://host.docker.internal:8000
SURREAL_NAMESPACE=main
SURREAL_DATABASE=main
SURREAL_ACCESS=account
```

`NEXTAUTH_SECRET` is required for stable JWT session encryption. Generate a local value with:

```bash
openssl rand -base64 32
```

## Database Schema

The auth table stores one user record per account. Direct record creation is denied to normal users. New users must be created through the `account` access method.

```surql
USE NS main DB main;

DEFINE TABLE IF NOT EXISTS user SCHEMAFULL
  PERMISSIONS
    FOR select, update, delete WHERE id = $auth.id,
    FOR create NONE;

DEFINE FIELD OVERWRITE username ON TABLE user TYPE string ASSERT string::is_alphanum($value);
DEFINE FIELD IF NOT EXISTS name ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS email ON TABLE user TYPE string ASSERT string::is_email($value);
DEFINE FIELD IF NOT EXISTS password ON TABLE user TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE user TYPE datetime DEFAULT time::now();

DEFINE INDEX IF NOT EXISTS userEmailIndex ON TABLE user FIELDS email UNIQUE;
```

The unique email index prevents duplicate accounts.

## Record Access

OpenBayan uses `DEFINE ACCESS ... TYPE RECORD`.

```surql
DEFINE ACCESS OVERWRITE account ON DATABASE TYPE RECORD
  SIGNUP (
    CREATE user CONTENT {
      username: $username,
      name: $name,
      email: $email,
      password: crypto::argon2::generate($password)
    }
  )
  SIGNIN (
    SELECT * FROM user
    WHERE email = $email AND crypto::argon2::compare(password, $password)
  )
  DURATION FOR SESSION 24h;
```

Signup stores an Argon2 password hash. Signin compares the supplied password against the stored hash and returns a SurrealDB token when the credentials are valid.

## HTTP Signup

SurrealDB's `/signup` endpoint expects `NS`, `DB`, and `AC`, followed by the variables used by the `SIGNUP` query.

```bash
curl -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "NS": "main",
    "DB": "main",
    "AC": "account",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "password": "VerySecurePassword!"
  }' \
  http://localhost:8000/signup
```

Expected result:

```json
"<surrealdb-jwt-token>"
```

Depending on SurrealDB version and client, the token can also be returned in a JSON object. The frontend helper accepts both shapes.

## HTTP Signin

```bash
curl -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "NS": "main",
    "DB": "main",
    "AC": "account",
    "email": "john.doe@example.com",
    "password": "VerySecurePassword!"
  }' \
  http://localhost:8000/signin
```

Expected result:

```json
"<surrealdb-jwt-token>"
```

## NextAuth Integration

The frontend auth flow is implemented in these files:

```text
openbayan/app/api/auth/[...nextauth]/route.ts
openbayan/app/api/auth/signup/route.ts
openbayan/lib/surreal-auth.ts
openbayan/components/auth-form.tsx
openbayan/types/next-auth.d.ts
```

Login flow:

1. User submits the login form.
2. `next-auth/react` calls the credentials provider.
3. The credentials provider calls `signinWithSurreal`.
4. `signinWithSurreal` posts to `http://localhost:8000/signin`.
5. SurrealDB validates the email and password.
6. NextAuth stores the SurrealDB token inside its JWT session.

Signup flow:

1. User submits the register form.
2. `POST /api/auth/signup` calls `signupWithSurreal`.
3. `signupWithSurreal` posts to `http://localhost:8000/signup`.
4. SurrealDB creates a `user` record and returns a token.
5. The UI immediately signs in with the credentials provider.
6. User is redirected to `/workspace`.

## Session Data

NextAuth exposes the SurrealDB token on the session:

```ts
session.user.id
session.user.email
session.user.surrealToken
```

Use `session.user.surrealToken` only in server-side code when calling SurrealDB as the logged-in record user. Do not expose this token to unrelated browser scripts or third-party services.

## Calling SurrealDB as the Logged-In User

For future authenticated SurrealDB queries, send the token with the request:

```bash
curl -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <surrealdb-jwt-token>" \
  -d 'SELECT * FROM user WHERE id = $auth.id;' \
  "http://localhost:8000/sql"
```

Record permissions use `$auth.id`, so the logged-in user can only select, update, or delete their own `user` record.

## Common Problems

If signup returns a duplicate index error, the email already exists in `user`.

If signin returns an authentication error, check that:

- `SURREAL_ACCESS=account`
- the schema was applied after the access method was added
- the password field is named `password`, not `pass`
- the stored password was created with `crypto::argon2::generate`

If the frontend cannot connect to SurrealDB, check:

- `docker ps` shows `bayan_surrealdb`
- `http://localhost:8000` is reachable from the host
- `SURREAL_HTTP_URL` points to `http://host.docker.internal:8000` when Next.js runs in Docker

If NextAuth redirects but the session is missing, check:

- `NEXTAUTH_SECRET` is set
- `NEXTAUTH_URL` matches the frontend URL
- `bun run build` passes TypeScript checks

## Security Notes

The local Docker setup uses `root/root` for development only. Do not use these credentials in production.

For production:

- replace root credentials
- set a strong `NEXTAUTH_SECRET`
- serve the frontend and SurrealDB over HTTPS
- restrict direct SurrealDB network access
- keep user-facing queries behind record permissions
- avoid logging passwords, SurrealDB tokens, or NextAuth JWTs
