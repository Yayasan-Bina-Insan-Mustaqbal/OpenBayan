# Default Development Accounts

This document lists the default accounts seeded in the development environment.

> [!WARNING]
> These credentials are for local development and testing purposes only.

## 👥 Seeded Users

| Account Type | Email | Password | Username |
| :--- | :--- | :--- | :--- |
| **Default User** | `user@openbayan.org` | `password123` | OpenBayan User |
| **Admin User** | `abu.hafsh@openbayan.org` | `securepassword` | Abu Hafsh |

## 🛠 Management

These accounts are initialized via the `OpenBayanBackend/schema/seed.surql` script. If you need to reset the database or change these accounts, update the seed file and run the initialization script:

```bash
cd OpenBayanBackend
./apply_schema.sh
```

## 🔐 Authentication Notes

- **NextAuth.js**: The frontend uses NextAuth.js configured with the SurrealDB adapter.
- **Argon2**: Passwords are hashed using Argon2 via SurrealDB's `crypto::argon2::generate()` function.
