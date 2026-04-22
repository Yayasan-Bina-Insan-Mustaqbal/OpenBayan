-- ---------------------------------------------------------
-- OpenBayan: Clean Seed Data (Auth Only)
-- ---------------------------------------------------------

-- 1. CREATE USERS
-- Default user for Next.js Authentication
CREATE user:default SET \
    username = 'OpenBayan User', \
    email = 'user@openbayan.org', \
    password = crypto::argon2::generate('password123'), \
    created_at = time::now();

CREATE user:admin SET \
    username = 'Abu Hafsh', \
    email = 'abu.hafsh@openbayan.org', \
    password = crypto::argon2::generate('securepassword'), \
    created_at = time::now();

-- 2. CREATE SAHIFAH (Documents)
CREATE sahifah:intro SET \
    title = 'Welcome to OpenBayan', \
    content = 'OpenBayan is a research-focused platform for Islamic data analysis.', \
    author = user:admin, \
    tags = ['intro', 'platform'], \
    created_at = time::now();

CREATE sahifah:surrealdb_guide SET \
    title = 'Getting Started with SurrealDB', \
    content = 'SurrealDB handles documents, graphs, and vectors all in one place.', \
    author = user:default, \
    tags = ['tutorial', 'database'], \
    created_at = time::now();
