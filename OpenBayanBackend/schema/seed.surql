-- ---------------------------------------------------------
-- OpenBayan: Clean Seed Data (Auth Only)
-- ---------------------------------------------------------

-- 1. CREATE USERS
-- Default user for Next.js Authentication
CREATE user:default SET 
    username = 'OpenBayan User', 
    email = 'user@openbayan.org', 
    password = crypto::argon2::generate('password123'),
    created_at = time::now();

CREATE user:admin SET 
    username = 'Abu Hafsh', 
    email = 'abu.hafsh@openbayan.org', 
    password = crypto::argon2::generate('securepassword'),
    created_at = time::now();
