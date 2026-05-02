-- ---------------------------------------------------------
-- OpenBayan: Sentences Schema (Unified)
-- ---------------------------------------------------------

-- 1. DEFINE TABLE
DEFINE TABLE OVERWRITE sentence SCHEMAFULL;

-- 2. DEFINE FIELDS
DEFINE FIELD OVERWRITE text ON TABLE sentence TYPE string;
DEFINE FIELD OVERWRITE simple_clean_text ON TABLE sentence TYPE option<string>;
DEFINE FIELD OVERWRITE llm_context ON TABLE sentence TYPE string;
DEFINE FIELD OVERWRITE chunk_index ON TABLE sentence TYPE int;

-- Source Classification
-- e.g., "quran", "hadith", "book"
DEFINE FIELD OVERWRITE source_type ON TABLE sentence TYPE string;

-- Unified Metadata Placeholder
-- We use specific fields for Quran for better indexing, 
-- but we could also use a flexible object.
-- For now, let's keep the Quran specific fields as optional for other types.

-- Quran Specific Fields (Optional for other types)
DEFINE FIELD OVERWRITE ayah_number ON TABLE sentence TYPE option<int>;
DEFINE FIELD OVERWRITE surah_number ON TABLE sentence TYPE option<int>;
DEFINE FIELD OVERWRITE surah_name ON TABLE sentence TYPE option<string>;
DEFINE FIELD OVERWRITE number_in_surah ON TABLE sentence TYPE option<int>;
DEFINE FIELD OVERWRITE juz ON TABLE sentence TYPE option<int>;
DEFINE FIELD OVERWRITE hizb_quarter ON TABLE sentence TYPE option<int>;
DEFINE FIELD OVERWRITE page ON TABLE sentence TYPE option<int>;

-- Versioning/Edition info
DEFINE FIELD OVERWRITE version_type ON TABLE sentence TYPE option<string>;
DEFINE FIELD OVERWRITE edition_identifier ON TABLE sentence TYPE option<string>;

-- General Metadata
DEFINE FIELD OVERWRITE source_url ON TABLE sentence TYPE string;
DEFINE FIELD OVERWRITE other_editions ON TABLE sentence TYPE array DEFAULT [];

-- Timestamp
DEFINE FIELD OVERWRITE created_at ON TABLE sentence TYPE datetime DEFAULT time::now();

-- 3. DEFINE INDEXES
-- For Quranic sentences, uniqueness is based on ayah and chunk index
-- For other types, we might need a different unique constraint
DEFINE INDEX OVERWRITE quranSentenceIndex ON TABLE sentence FIELDS source_type, ayah_number, chunk_index;
