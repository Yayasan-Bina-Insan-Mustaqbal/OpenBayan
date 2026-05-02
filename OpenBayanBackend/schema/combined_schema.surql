-- ---------------------------------------------------------
-- OpenBayan: Combined Schema
-- ---------------------------------------------------------

-- 1. AUTH & USERS
DEFINE TABLE user SCHEMAFULL PERMISSIONS FOR select, update, delete WHERE id = $auth.id, FOR create NONE;
DEFINE FIELD username ON TABLE user TYPE string;
DEFINE FIELD name ON TABLE user TYPE option<string>;
DEFINE FIELD email ON TABLE user TYPE string ASSERT string::is_email($value);
DEFINE FIELD password ON TABLE user TYPE string;
DEFINE FIELD role ON TABLE user TYPE string DEFAULT "researcher";
DEFINE FIELD created_at ON TABLE user TYPE datetime DEFAULT time::now();
DEFINE INDEX userEmailIndex ON TABLE user FIELDS email UNIQUE;

DEFINE ACCESS account ON DATABASE TYPE RECORD SIGNUP ( CREATE user CONTENT { username: $username, name: $name, email: $email, password: crypto::argon2::generate($password) } ) SIGNIN ( SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(password, $password) ) DURATION FOR SESSION 24h;

-- 2. ALAMAH (Tags / Categories)
DEFINE TABLE alamah SCHEMAFULL;
DEFINE FIELD label       ON alamah TYPE string;
DEFINE FIELD label_ar    ON alamah TYPE option<string>;
DEFINE FIELD description ON alamah TYPE option<string>;
DEFINE FIELD color       ON alamah TYPE option<string>;
DEFINE FIELD category    ON alamah TYPE option<string>; -- e.g., "subject", "entity", "attribute"
DEFINE FIELD parent      ON alamah TYPE option<record<alamah>>;
DEFINE FIELD level       ON alamah TYPE int DEFAULT 1;
DEFINE FIELD created_at  ON alamah TYPE datetime DEFAULT time::now();
DEFINE INDEX alamah_label ON alamah FIELDS label UNIQUE;

-- 3. SAHIFAH
DEFINE TABLE sahifah SCHEMAFULL PERMISSIONS FOR select WHERE $auth.id != NONE, FOR create, update, delete WHERE author = $auth.id;
DEFINE FIELD title ON TABLE sahifah TYPE string;
DEFINE FIELD content ON TABLE sahifah TYPE string;
DEFINE FIELD author ON TABLE sahifah TYPE record<user>;
DEFINE FIELD tags ON TABLE sahifah TYPE array<string>;
DEFINE FIELD created_at ON TABLE sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON TABLE sahifah TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE INDEX sahifahTitleIndex ON TABLE sahifah FIELDS title;

-- 4. SENTENCES (Hybrid Search)
DEFINE TABLE sentence SCHEMAFULL;
DEFINE FIELD text ON TABLE sentence TYPE string;
DEFINE FIELD simple_clean_text ON TABLE sentence TYPE option<string>;
DEFINE FIELD llm_context ON TABLE sentence TYPE string;
DEFINE FIELD chunk_index ON TABLE sentence TYPE int;
DEFINE FIELD source_type ON TABLE sentence TYPE string;
DEFINE FIELD ayah_number ON TABLE sentence TYPE option<int>;
DEFINE FIELD surah_number ON TABLE sentence TYPE option<int>;
DEFINE FIELD surah_name ON TABLE sentence TYPE option<string>;
DEFINE FIELD number_in_surah ON TABLE sentence TYPE option<int>;
DEFINE FIELD juz ON TABLE sentence TYPE option<int>;
DEFINE FIELD hizb_quarter ON TABLE sentence TYPE option<int>;
DEFINE FIELD page ON TABLE sentence TYPE option<int>;
DEFINE FIELD version_type ON TABLE sentence TYPE option<string>;
DEFINE FIELD edition_identifier ON TABLE sentence TYPE option<string>;
DEFINE FIELD embedding ON TABLE sentence TYPE array<float, 1024>;
DEFINE FIELD embedding_clean ON TABLE sentence TYPE option<array<float, 1024>>;
DEFINE FIELD source_url ON TABLE sentence TYPE option<string>;
DEFINE FIELD other_editions ON TABLE sentence TYPE array DEFAULT [];
DEFINE FIELD created_at ON TABLE sentence TYPE datetime DEFAULT time::now();

-- 5. INDEXES & RELATIONS
DEFINE INDEX sentence_vector ON sentence FIELDS embedding HNSW DIMENSION 1024 DIST COSINE;
DEFINE INDEX quranSentenceIndex ON TABLE sentence FIELDS source_type, ayah_number, chunk_index;

-- Edge: entity -> tagged_with -> alamah
DEFINE TABLE tagged_with SCHEMAFULL TYPE RELATION IN sentence|sahifah|user OUT alamah;
DEFINE FIELD weight      ON tagged_with TYPE float DEFAULT 1.0; -- Confidence score
DEFINE FIELD created_at  ON tagged_with TYPE datetime DEFAULT time::now();

-- Edge: alamah -> sub_topic -> alamah (Hierarchical tags)
DEFINE TABLE sub_topic SCHEMAFULL TYPE RELATION IN alamah OUT alamah;
