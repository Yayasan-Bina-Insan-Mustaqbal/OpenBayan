-- ---------------------------------------------------------
-- OpenBayan: User Workspace Schema (Private Plane)
-- Database: openbayan_user
-- ---------------------------------------------------------

-- 1. ANALYZERS
DEFINE ANALYZER ascii TOKENIZERS BLANK FILTERS LOWERCASE, ASCII;

-- 2. USER ENTITIES
-- Existing user table (assuming it's already defined, but hardening fields)
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD password ON user TYPE string;
DEFINE FIELD role ON user TYPE string DEFAULT 'user' ASSERT $value INSIDE ['admin', 'researcher', 'user'];
DEFINE FIELD created_at ON user TYPE datetime DEFAULT time::now();
DEFINE INDEX user_email ON user FIELDS email UNIQUE;

-- 3. RESEARCH ARTIFACTS
-- Table: faidah (The Benefit/Insight)
DEFINE TABLE faidah SCHEMAFULL
  PERMISSIONS 
    FOR select WHERE owner = $auth.id OR is_public = true,
    FOR create, update, delete WHERE owner = $auth.id;

DEFINE FIELD owner ON faidah TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD title ON faidah TYPE option<string>;
DEFINE FIELD body ON faidah TYPE string;
DEFINE FIELD embedding ON faidah TYPE option<array<float, 1024>>;
DEFINE FIELD is_public ON faidah TYPE bool DEFAULT false;
DEFINE FIELD created_at ON faidah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON faidah TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE INDEX faidah_body ON faidah FIELDS body FULLTEXT ANALYZER ascii BM25;
DEFINE INDEX faidah_vector ON faidah FIELDS embedding HNSW DIMENSION 1024 DIST COSINE;

-- Table: majmu (The Collection/Aggregate)
DEFINE TABLE majmu SCHEMAFULL
  PERMISSIONS 
    FOR select WHERE owner = $auth.id OR is_public = true,
    FOR create, update, delete WHERE owner = $auth.id;

DEFINE FIELD owner ON majmu TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD title ON majmu TYPE string;
DEFINE FIELD description ON majmu TYPE option<string>;
DEFINE FIELD color ON majmu TYPE option<string>;
DEFINE FIELD is_public ON majmu TYPE bool DEFAULT false;
DEFINE FIELD created_at ON majmu TYPE datetime DEFAULT time::now();

-- Table: sahifah (Custom User Documents/Articles)
DEFINE TABLE sahifah SCHEMAFULL
  PERMISSIONS 
    FOR select WHERE author = $auth.id OR is_public = true,
    FOR create WHERE $auth.id != NONE,
    FOR update, delete WHERE author = $auth.id;

DEFINE FIELD title ON sahifah TYPE string;
DEFINE FIELD content ON sahifah TYPE string;
DEFINE FIELD author ON sahifah TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD is_public ON sahifah TYPE bool DEFAULT false;
DEFINE FIELD created_at ON sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON sahifah TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE FIELD tags ON TABLE sahifah TYPE array<string>;
DEFINE INDEX sahifahTitleIndex ON TABLE sahifah FIELDS title FULLTEXT ANALYZER ascii BM25;

-- Table: alamah (Categories/Topics)
DEFINE TABLE alamah SCHEMAFULL;
DEFINE FIELD label_en ON alamah TYPE string;
DEFINE FIELD label_ar ON alamah TYPE string;
DEFINE FIELD description ON alamah TYPE option<string>;
DEFINE FIELD color ON alamah TYPE string DEFAULT "#10b981"; -- Research Emerald
DEFINE FIELD classification ON alamah TYPE string DEFAULT "general" ASSERT $value INSIDE ['theology', 'jurisprudence', 'linguistics', 'history', 'general'];
DEFINE FIELD parent ON alamah TYPE option<record<alamah>>;
DEFINE FIELD created_at ON alamah TYPE datetime DEFAULT time::now();
DEFINE INDEX category_label ON alamah FIELDS label_en, label_ar;

-- 4. WORKSPACE & UI STATE
DEFINE TABLE workspace SCHEMAFULL
  PERMISSIONS FOR select, update, delete WHERE user = $auth.id, FOR create NONE;
DEFINE FIELD user ON workspace TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD layout ON workspace TYPE object;
DEFINE FIELD active_tabs ON workspace TYPE array<string>;
DEFINE FIELD updated_at ON workspace TYPE datetime DEFAULT time::now() VALUE time::now();

DEFINE TABLE search_history SCHEMAFULL
  PERMISSIONS FOR select, update, delete WHERE user = $auth.id, FOR create NONE;
DEFINE FIELD user ON search_history TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD query ON search_history TYPE string;
DEFINE FIELD results_count ON search_history TYPE int;
DEFINE FIELD created_at ON search_history TYPE datetime DEFAULT time::now();

DEFINE TABLE user_feedback SCHEMAFULL
  PERMISSIONS FOR select, update, delete WHERE user = $auth.id, FOR create NONE;
DEFINE FIELD user ON user_feedback TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD target_id ON user_feedback TYPE record;
DEFINE FIELD rating ON user_feedback TYPE int ASSERT $value >= 1 AND $value <= 5;
DEFINE FIELD comment ON user_feedback TYPE option<string>;
DEFINE FIELD created_at ON user_feedback TYPE datetime DEFAULT time::now();

-- 5. RELATIONS (Polymorphic)
-- Graph: contains (Majmu -> Items)
DEFINE TABLE contains TYPE RELATION
  IN majmu 
  OUT sentence | hadith | faidah | sahifah; -- Can contain sentences, hadiths, or other fawa'id

-- Graph: tagged_with (Personal items -> Alamah)
DEFINE TABLE tagged_with TYPE RELATION
  IN faidah | sahifah | user
  OUT alamah;
DEFINE FIELD weight ON tagged_with TYPE float DEFAULT 1.0;
DEFINE FIELD reasoning ON tagged_with TYPE option<string>;
DEFINE FIELD created_at ON tagged_with TYPE datetime DEFAULT time::now();
