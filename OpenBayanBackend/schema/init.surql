-- ---------------------------------------------------------
-- OpenBayan: Initial Database Schema
-- ---------------------------------------------------------

-- 1. DEFINE TABLES
DEFINE TABLE IF NOT EXISTS user SCHEMAFULL
  PERMISSIONS
    FOR select, update, delete WHERE id = $auth.id,
    FOR create NONE;

DEFINE TABLE IF NOT EXISTS sahifah SCHEMAFULL
  PERMISSIONS
    FOR select WHERE $auth.id != NONE,
    FOR create, update, delete WHERE author = $auth.id;

-- 2. DEFINE FIELDS (User)
DEFINE FIELD IF NOT EXISTS username ON TABLE user TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE user TYPE option<string>;
DEFINE FIELD IF NOT EXISTS email ON TABLE user TYPE string ASSERT string::is_email($value);
DEFINE FIELD IF NOT EXISTS password ON TABLE user TYPE string;
DEFINE FIELD IF NOT EXISTS role ON TABLE user TYPE string DEFAULT "researcher";
DEFINE FIELD IF NOT EXISTS created_at ON TABLE user TYPE datetime DEFAULT time::now();

-- 3. DEFINE FIELDS (Sahifah - Documents)
DEFINE FIELD IF NOT EXISTS title ON TABLE sahifah TYPE string;
DEFINE FIELD IF NOT EXISTS content ON TABLE sahifah TYPE string;
DEFINE FIELD IF NOT EXISTS author ON TABLE sahifah TYPE record<user>;
DEFINE FIELD IF NOT EXISTS tags ON TABLE sahifah TYPE array<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE sahifah TYPE datetime DEFAULT time::now() VALUE time::now();

-- 4. DEFINE ACCESS (Authentication)
DEFINE ACCESS IF NOT EXISTS account ON DATABASE TYPE RECORD
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
DEFINE INDEX IF NOT EXISTS userEmailIndex ON TABLE user FIELDS email UNIQUE;
DEFINE INDEX IF NOT EXISTS sahifahTitleIndex ON TABLE sahifah FIELDS title;

-- 5. INITIAL DATA (Optional)
-- CREATE user:admin SET username = 'admin', email = 'admin@openbayan.org', password = 'password';
