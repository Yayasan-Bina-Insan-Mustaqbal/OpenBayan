-- ---------------------------------------------------------
-- OpenBayan: Initial Database Schema
-- ---------------------------------------------------------

-- 1. DEFINE TABLES
DEFINE TABLE user SCHEMAFULL;
DEFINE TABLE sahifah SCHEMAFULL;

-- 2. DEFINE FIELDS (User)
DEFINE FIELD username ON TABLE user TYPE string;
DEFINE FIELD email ON TABLE user TYPE string ASSERT $value = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
DEFINE FIELD password ON TABLE user TYPE string;
DEFINE FIELD created_at ON TABLE user TYPE datetime DEFAULT time::now();

-- 3. DEFINE FIELDS (Sahifah - Documents)
DEFINE FIELD title ON TABLE sahifah TYPE string;
DEFINE FIELD content ON TABLE sahifah TYPE string;
DEFINE FIELD author ON TABLE sahifah TYPE record<user>;
DEFINE FIELD tags ON TABLE sahifah TYPE array<string>;
DEFINE FIELD created_at ON TABLE sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON TABLE sahifah TYPE datetime DEFAULT time::now() VALUE time::now();

-- 4. DEFINE INDEXES
DEFINE INDEX userEmailIndex ON TABLE user FIELDS email UNIQUE;
DEFINE INDEX sahifahTitleIndex ON TABLE sahifah FIELDS title;

-- 5. INITIAL DATA (Optional)
-- CREATE user:admin SET username = 'admin', email = 'admin@openbayan.org', password = 'password';
