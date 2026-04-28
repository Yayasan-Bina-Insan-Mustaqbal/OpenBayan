-- ---------------------------------------------------------
-- OpenBayan: Initial Database Schema
-- ---------------------------------------------------------

-- 1. DEFINE TABLES
DEFINE TABLE OVERWRITE user SCHEMAFULL
  PERMISSIONS FOR select, update, delete WHERE id = $auth.id FOR create NONE;

DEFINE TABLE OVERWRITE sahifah SCHEMAFULL
  PERMISSIONS FOR select WHERE $auth.id != NONE FOR create, update, delete WHERE author = $auth.id;

-- 2. DEFINE FIELDS (User)
DEFINE FIELD OVERWRITE username ON TABLE user TYPE string;
DEFINE FIELD OVERWRITE name ON TABLE user TYPE option<string>;
DEFINE FIELD OVERWRITE email ON TABLE user TYPE string ASSERT string::is_email($value);
DEFINE FIELD OVERWRITE password ON TABLE user TYPE string;
DEFINE FIELD OVERWRITE role ON TABLE user TYPE string DEFAULT "researcher";
DEFINE FIELD OVERWRITE created_at ON TABLE user TYPE datetime DEFAULT time::now();

-- 3. DEFINE FIELDS (Sahifah - Documents)
DEFINE FIELD OVERWRITE title ON TABLE sahifah TYPE string;
DEFINE FIELD OVERWRITE content ON TABLE sahifah TYPE string;
DEFINE FIELD OVERWRITE author ON TABLE sahifah TYPE record<user>;
DEFINE FIELD OVERWRITE tags ON TABLE sahifah TYPE array<string>;
DEFINE FIELD OVERWRITE created_at ON TABLE sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD OVERWRITE updated_at ON TABLE sahifah TYPE datetime DEFAULT time::now() VALUE time::now();

-- 4. DEFINE ACCESS (Authentication)
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

-- 5. DEFINE INDEXES
DEFINE INDEX OVERWRITE userEmailIndex ON TABLE user FIELDS email UNIQUE;
DEFINE INDEX OVERWRITE sahifahTitleIndex ON TABLE sahifah FIELDS title;
