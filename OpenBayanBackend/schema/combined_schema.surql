-- ---------------------------------------------------------
-- OpenBayan: Combined Schema (Hardened 3.0)
-- ---------------------------------------------------------

-- 0. ANALYZERS
DEFINE ANALYZER ascii TOKENIZERS BLANK FILTERS LOWERCASE, ASCII;

-- 1. AUTH & USERS
DEFINE TABLE user SCHEMAFULL PERMISSIONS FOR select, update, delete WHERE id = $auth.id, FOR create NONE;
DEFINE FIELD username ON TABLE user TYPE string ASSERT !!$value OR THROW "Username is mandatory";
DEFINE FIELD name ON TABLE user TYPE option<string>;
DEFINE FIELD email ON TABLE user TYPE string ASSERT (string::is_email($value) AND !!$value) OR THROW "A valid email address is required";
DEFINE FIELD password ON TABLE user TYPE string ASSERT !!$value OR THROW "Password cannot be empty";
DEFINE FIELD role ON TABLE user TYPE string DEFAULT "researcher" ASSERT $value IN ["researcher", "editor", "admin"] OR THROW "Invalid user role";

DEFINE FIELD created_at ON TABLE user TYPE datetime DEFAULT time::now();
DEFINE INDEX userEmailIndex ON TABLE user FIELDS email UNIQUE;

DEFINE ACCESS account ON DATABASE TYPE RECORD 
    SIGNUP ( CREATE user CONTENT { username: $username, name: $name, email: $email, password: crypto::argon2::generate($password) } ) 
    SIGNIN ( SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(password, $password) ) 
    DURATION FOR SESSION 24h;

-- 1.1 USER RESEARCH TOOLS (Faidah & Majmu)

-- Table: faidah (The Atomic Benefit/Note)
DEFINE TABLE faidah SCHEMAFULL PERMISSIONS FOR select WHERE owner = $auth.id OR is_public = true, FOR create, update, delete WHERE owner = $auth.id;
DEFINE FIELD body ON faidah TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD source_ref ON faidah TYPE option<string>;
DEFINE FIELD embedding ON faidah TYPE option<array<float, 1024>>;
DEFINE FIELD owner ON faidah TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD is_public ON faidah TYPE bool DEFAULT false;
DEFINE FIELD created_at ON faidah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON faidah TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE INDEX faidah_body ON faidah FIELDS body FULLTEXT ANALYZER ascii BM25;
DEFINE INDEX faidah_vector ON faidah FIELDS embedding HNSW DIMENSION 1024 DIST COSINE;

-- Table: majmu (The Collection/Aggregate)
DEFINE TABLE majmu SCHEMAFULL PERMISSIONS FOR select WHERE owner = $auth.id OR is_public = true, FOR create, update, delete WHERE owner = $auth.id;
DEFINE FIELD title ON majmu TYPE string ASSERT !!$value OR THROW "Majmu title is mandatory";
DEFINE FIELD description ON majmu TYPE option<string>;
DEFINE FIELD owner ON majmu TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD is_public ON majmu TYPE bool DEFAULT false;
DEFINE FIELD created_at ON majmu TYPE datetime DEFAULT time::now();

-- Table: workspace (UI State Persistence)
DEFINE TABLE workspace SCHEMAFULL PERMISSIONS FOR select, update, delete WHERE user = $auth.id;
DEFINE FIELD name ON workspace TYPE string ASSERT !!$value OR THROW "Workspace name is mandatory";
DEFINE FIELD layout ON workspace TYPE option<object>; 
DEFINE FIELD user ON workspace TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD created_at ON workspace TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON workspace TYPE datetime DEFAULT time::now() VALUE time::now();

-- Table: search_history (Discovery tracking)
DEFINE TABLE search_history SCHEMAFULL PERMISSIONS FOR select, update, delete WHERE user = $auth.id;
DEFINE FIELD query ON search_history TYPE string ASSERT !!$value;
DEFINE FIELD filters ON search_history TYPE option<object>;
DEFINE FIELD user ON search_history TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD created_at ON search_history TYPE datetime DEFAULT time::now();

-- 1.2 USER FEEDBACK (AI Relevance Training)
DEFINE TABLE user_feedback SCHEMAFULL PERMISSIONS FOR select, update, delete WHERE user = $auth.id;
DEFINE FIELD sentence ON user_feedback TYPE record<sentence> ASSERT !!$value;
DEFINE FIELD relevance_score ON user_feedback TYPE int ASSERT $value >= 0 AND $value <= 100;
DEFINE FIELD comments ON user_feedback TYPE option<string>;
DEFINE FIELD status ON user_feedback TYPE string DEFAULT "pending" ASSERT $value IN ["pending", "resolved"];
DEFINE FIELD user ON user_feedback TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD created_at ON user_feedback TYPE datetime DEFAULT time::now();


-- 2. CATEGORY (Alamah / Marks)
DEFINE TABLE category SCHEMAFULL;
DEFINE FIELD label       ON category TYPE string ASSERT !!$value OR THROW "Category label is mandatory";
DEFINE FIELD label_ar    ON category TYPE option<string>;
DEFINE FIELD description ON category TYPE option<string>;
DEFINE FIELD note        ON category TYPE option<string>; -- Scholarly Note for the Mark
DEFINE FIELD color       ON category TYPE option<string>;
DEFINE FIELD classification ON category TYPE option<string>; -- e.g., "subject", "entity", "attribute"
DEFINE FIELD parent      ON category TYPE option<record<category>>;
DEFINE FIELD owner       ON category TYPE option<record<user>>; -- Null means global/system tag
DEFINE FIELD created_at  ON category TYPE datetime DEFAULT time::now();

-- Computed Field: Popularity (based on tag count)
DEFINE FIELD popularity ON category VALUE (SELECT count() FROM tagged_with WHERE out = $parent.id);

DEFINE INDEX category_label ON category FIELDS label UNIQUE;


-- 3. SAHIFAH
DEFINE TABLE sahifah SCHEMAFULL PERMISSIONS FOR select WHERE author = $auth.id OR is_public = true, FOR create WHERE $auth.id != NONE, FOR update, delete WHERE author = $auth.id;
DEFINE FIELD title ON TABLE sahifah TYPE string ASSERT !!$value OR THROW "Sahifah title is mandatory";
DEFINE FIELD content ON TABLE sahifah TYPE option<string>;
DEFINE FIELD author ON TABLE sahifah TYPE record<user> DEFAULT $auth.id ASSERT !!$value OR THROW "Sahifah must have an author";
DEFINE FIELD is_public ON sahifah TYPE bool DEFAULT false;
DEFINE FIELD created_at ON TABLE sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON TABLE sahifah TYPE datetime DEFAULT time::now() VALUE time::now();

-- Computed Logic: Document Importance (based on tags)
DEFINE FIELD importance_score ON sahifah VALUE (SELECT count() FROM tagged_with WHERE in = $parent.id);

DEFINE FIELD tags ON TABLE sahifah TYPE array<string>;
DEFINE INDEX sahifahTitleIndex ON TABLE sahifah FIELDS title FULLTEXT ANALYZER ascii BM25;


-- 4. SENTENCES (Knowledge unit)
DEFINE TABLE sentence SCHEMAFULL;
DEFINE FIELD text ON TABLE sentence TYPE string ASSERT !!$value OR THROW "Sentence text content is mandatory";
DEFINE FIELD simple_clean_text ON TABLE sentence TYPE option<string>;
DEFINE FIELD chunk_index ON TABLE sentence TYPE int;
DEFINE FIELD embedding ON TABLE sentence TYPE array<float, 1024>;
DEFINE FIELD embedding_transliteration ON TABLE sentence TYPE option<array<float, 1024>>;
DEFINE FIELD embedding_clean ON TABLE sentence TYPE option<array<float, 1024>>;
DEFINE FIELD metadata ON sentence TYPE option<object>; -- For juz, page, transliteration, etc.
DEFINE FIELD parent ON sentence TYPE record<ayah | hadith | book_section> ASSERT $value != NONE;
DEFINE FIELD source ON sentence TYPE record<source> ASSERT $value != NONE;
DEFINE FIELD created_at ON TABLE sentence TYPE datetime DEFAULT time::now();

-- Computed Logic: Mention Count (Importance Score)
DEFINE FIELD mention_count ON sentence VALUE (SELECT count() FROM mentions WHERE in = $parent.id);


DEFINE TABLE ayah SCHEMAFULL;
DEFINE FIELD surah_number ON ayah TYPE int ASSERT !!$value;
DEFINE FIELD ayah_number ON ayah TYPE int ASSERT !!$value;
DEFINE FIELD uthmani_text ON ayah TYPE string;
DEFINE FIELD summary ON ayah TYPE option<string>; -- Enrichment Entry Point
DEFINE FIELD embedding_summary ON ayah TYPE option<array<float, 1024>>; -- Vector for high-level search
DEFINE FIELD created_at ON ayah TYPE datetime DEFAULT time::now();
DEFINE INDEX ayah_coords ON ayah FIELDS surah_number, ayah_number UNIQUE;


-- 5. INDEXES & HYBRID SEARCH
-- BM25 Index for Keyword Search
DEFINE INDEX sentence_text_bm25 ON sentence FIELDS text FULLTEXT ANALYZER ascii BM25;
-- HNSW Index for Vector Search
DEFINE INDEX sentence_vector ON sentence FIELDS embedding HNSW DIMENSION 1024 DIST COSINE;
DEFINE INDEX sentence_transliteration_vector ON sentence FIELDS embedding_transliteration HNSW DIMENSION 1024 DIST COSINE;
DEFINE INDEX quranSentenceIndex ON TABLE sentence FIELDS parent, chunk_index;


-- 6. GRAPH RELATIONS (Hardened with ENFORCED)

-- Relation: [Faidah] -> extracted_from -> [Sahifah|Ayah]
DEFINE TABLE extracted_from SCHEMAFULL TYPE RELATION IN faidah OUT sahifah|ayah ENFORCED;
DEFINE FIELD created_at ON extracted_from TYPE datetime DEFAULT time::now();

-- Relation: [Majmu] -> contains -> [Faidah|Sahifah|Sentence|Ayah]
DEFINE TABLE contains SCHEMAFULL TYPE RELATION IN majmu OUT faidah|sahifah|sentence|ayah ENFORCED;
DEFINE FIELD created_at ON contains TYPE datetime DEFAULT time::now();

-- Relation: [Sentence|Sahifah|User|Faidah] -> tagged_with -> [Category]
DEFINE TABLE tagged_with SCHEMAFULL TYPE RELATION IN sentence|sahifah|user|faidah OUT category ENFORCED;
DEFINE FIELD weight      ON tagged_with TYPE int DEFAULT 5 ASSERT $value >= 1 AND $value <= 10;
DEFINE FIELD reasoning   ON tagged_with TYPE option<string>;
DEFINE FIELD created_at  ON tagged_with TYPE datetime DEFAULT time::now();

-- Edge: [Category] -> sub_topic -> [Category]
DEFINE TABLE sub_topic SCHEMAFULL TYPE RELATION IN category OUT category ENFORCED;


-- 7. ENTITIES & MENTIONS
DEFINE TABLE entity SCHEMAFULL;
DEFINE FIELD name ON entity TYPE string ASSERT !!$value;
DEFINE FIELD type ON entity TYPE string ASSERT !!$value; -- e.g., "Person", "Place"
DEFINE FIELD created_at ON entity TYPE datetime DEFAULT time::now();
DEFINE INDEX entity_name ON entity FIELDS name UNIQUE;

-- Edge: [Sentence] -> mentions -> [Entity]
DEFINE TABLE mentions SCHEMAFULL TYPE RELATION IN sentence OUT entity ENFORCED;
DEFINE FIELD created_at ON mentions TYPE datetime DEFAULT time::now();

-- Edge: [Entity] -> entity_tagged_with -> [Category]
DEFINE TABLE entity_tagged_with SCHEMAFULL TYPE RELATION IN entity OUT category ENFORCED;
DEFINE FIELD weight      ON entity_tagged_with TYPE int DEFAULT 5;
DEFINE FIELD created_at  ON entity_tagged_with TYPE datetime DEFAULT time::now();
