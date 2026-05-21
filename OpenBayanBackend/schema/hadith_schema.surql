-- ---------------------------------------------------------
-- OpenBayan: Hadith Table Schema
-- ---------------------------------------------------------

-- 1. DEFINE TABLE
DEFINE TABLE IF NOT EXISTS hadith SCHEMAFULL;

-- 2. DEFINE FIELDS
DEFINE FIELD book_number ON TABLE hadith TYPE option<string>;
DEFINE FIELD chapter_title ON TABLE hadith TYPE option<string>;
DEFINE FIELD collection ON TABLE hadith TYPE option<string>; -- e.g., "bukhari", "muslim"
DEFINE FIELD grade ON TABLE hadith TYPE option<string>; -- e.g., "Sahih", "Hasan", "Da'if"
DEFINE FIELD hadith_number ON TABLE hadith TYPE option<string>;
DEFINE FIELD isnad ON TABLE hadith TYPE option<string>; -- Chain of narration
DEFINE FIELD main_full ON TABLE hadith TYPE option<string>; -- Full matn text

-- Parallel Numbering Systems
DEFINE FIELD num_in_book ON TABLE hadith TYPE option<int>;
DEFINE FIELD num_arabic ON TABLE hadith TYPE option<number | string>;
DEFINE FIELD num_fuad_baqi ON TABLE hadith TYPE option<number | string>;
DEFINE FIELD num_usc_msa ON TABLE hadith TYPE option<string>;
DEFINE FIELD chapter_number ON TABLE hadith TYPE option<int>;
DEFINE FIELD book_name_ar ON TABLE hadith TYPE option<string>;

-- Relations & Metadata
DEFINE FIELD source ON TABLE hadith TYPE record<source> ASSERT $value != NONE;
DEFINE FIELD created_at ON TABLE hadith TYPE datetime DEFAULT time::now();

-- 3. DEFINE INDEXES
DEFINE INDEX hadith_ref ON hadith FIELDS collection, hadith_number UNIQUE;
DEFINE INDEX hadith_collection ON hadith FIELDS collection;
DEFINE INDEX hadith_grade ON hadith FIELDS grade;
DEFINE INDEX idx_in_book ON hadith FIELDS collection, book_number, num_in_book;
DEFINE INDEX idx_num_fuad_baqi ON hadith FIELDS collection, num_fuad_baqi;
DEFINE INDEX idx_num_arabic ON hadith FIELDS collection, num_arabic;
