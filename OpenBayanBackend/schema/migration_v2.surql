-- =============================================================
-- OpenBayan: Migration v2 - Research Intelligence Plane
-- =============================================================
-- Changes:
--   - alamah: NORMAL -> RELATION (user -> target)
--   - faidah: now always tied to an alamah
--   - bahs: renamed from search_history
--   - majmu: nestable (parent field) + updated contains
--   - topic: hierarchical (parent field, replaces sub_topic)
--   - entity_relation: entity -> entity links
--   - tagged_with: sentence -> topic|category only
-- =============================================================


-- 1. REMOVE OUTDATED TABLES
-- -------------------------------------------------------
REMOVE TABLE yields_faidah;
REMOVE TABLE search_history;
REMOVE TABLE sub_topic;
REMOVE TABLE alamah;
REMOVE TABLE tagged_with;
REMOVE TABLE contains;
REMOVE TABLE mentions;
REMOVE TABLE test_rel;
REMOVE TABLE test_rel_2;


-- 2. TOPIC (Hierarchical Chapters - like Bab/Chapter in books)
-- -------------------------------------------------------
DEFINE TABLE topic SCHEMAFULL;
DEFINE FIELD label    ON topic TYPE string ASSERT !!$value;
DEFINE FIELD label_ar ON topic TYPE option<string>;
DEFINE FIELD description ON topic TYPE option<string>;
DEFINE FIELD parent   ON topic TYPE option<record<topic>>;
DEFINE FIELD source   ON topic TYPE option<record<source>>; -- which book/corpus this belongs to
DEFINE FIELD created_at ON topic TYPE datetime DEFAULT time::now();
DEFINE INDEX topic_label ON topic FIELDS label;


-- 3. BAHS (Search/Query Log - renamed from search_history)
-- -------------------------------------------------------
DEFINE TABLE bahs SCHEMAFULL
  PERMISSIONS FOR select, update, delete WHERE owner = $auth.id, FOR create WHERE $auth.id != NONE;
DEFINE FIELD owner      ON bahs TYPE record<user> DEFAULT $auth.id;
DEFINE FIELD query      ON bahs TYPE string ASSERT !!$value;
DEFINE FIELD filters    ON bahs TYPE option<object>;
DEFINE FIELD result_count ON bahs TYPE option<int>;
DEFINE FIELD created_at ON bahs TYPE datetime DEFAULT time::now();
DEFINE INDEX bahs_owner ON bahs FIELDS owner;


-- 4. ALAMAH (Bookmark - RELATION: user -> target)
-- -------------------------------------------------------
-- Immutable once created. Contains breadcrumb of WHERE it was found.
DEFINE TABLE alamah TYPE RELATION
  IN user
  OUT sentence | entity | faidah | sahifah | bahs | category | topic;

DEFINE FIELD breadcrumb ON alamah TYPE option<object>; -- { query, filters, position, bahs_id }
DEFINE FIELD note       ON alamah TYPE option<string>; -- quick inline label
DEFINE FIELD created_at ON alamah TYPE datetime DEFAULT time::now();


-- 5. FAIDAH (Research Note - always tied to an alamah)
-- -------------------------------------------------------
DEFINE TABLE faidah SCHEMAFULL
  PERMISSIONS
    FOR select WHERE owner = $auth.id OR is_public = true,
    FOR create, update, delete WHERE owner = $auth.id;

DEFINE FIELD owner       ON faidah TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD ref_alamah  ON faidah TYPE record<alamah> ASSERT !!$value; -- the bookmark this note is about
DEFINE FIELD body        ON faidah TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD is_public   ON faidah TYPE bool DEFAULT false;
DEFINE FIELD forked_from ON faidah TYPE option<record<faidah>>; -- set if this is a diverged copy
DEFINE FIELD embedding   ON faidah TYPE option<array<float, 1024>>;
DEFINE FIELD created_at  ON faidah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at  ON faidah TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE INDEX faidah_body   ON faidah FIELDS body FULLTEXT ANALYZER ascii BM25;
DEFINE INDEX faidah_vector ON faidah FIELDS embedding HNSW DIMENSION 1024 DIST COSINE;
DEFINE INDEX faidah_owner  ON faidah FIELDS owner;


-- 6. MAJMU (Folder/Collection - nestable)
-- -------------------------------------------------------
DEFINE TABLE majmu SCHEMAFULL
  PERMISSIONS
    FOR select WHERE owner = $auth.id OR is_public = true,
    FOR create, update, delete WHERE owner = $auth.id;

DEFINE FIELD owner       ON majmu TYPE record<user> DEFAULT $auth.id ASSERT !!$value;
DEFINE FIELD title       ON majmu TYPE string ASSERT !!$value OR THROW "Majmu title is mandatory";
DEFINE FIELD description ON majmu TYPE option<string>;
DEFINE FIELD color       ON majmu TYPE option<string>;
DEFINE FIELD icon        ON majmu TYPE option<string>;
DEFINE FIELD parent      ON majmu TYPE option<record<majmu>>; -- for folder nesting
DEFINE FIELD is_public   ON majmu TYPE bool DEFAULT false;
DEFINE FIELD created_at  ON majmu TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at  ON majmu TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE INDEX majmu_owner ON majmu FIELDS owner;


-- 7. ENTITY RELATIONS (entity -> entity links)
-- -------------------------------------------------------
DEFINE TABLE entity_relation TYPE RELATION IN entity OUT entity;
DEFINE FIELD relation_type ON entity_relation TYPE string; -- e.g., "sent_to", "teacher_of", "mentioned_with"
DEFINE FIELD description   ON entity_relation TYPE option<string>;
DEFINE FIELD source_ref    ON entity_relation TYPE option<record<sentence | hadith>>; -- where this relation appears
DEFINE FIELD created_at    ON entity_relation TYPE datetime DEFAULT time::now();


-- 8. MENTIONS (sentence -> entity)
-- -------------------------------------------------------
DEFINE TABLE mentions TYPE RELATION IN sentence | hadith OUT entity;
DEFINE FIELD created_at ON mentions TYPE datetime DEFAULT time::now();
DEFINE FIELD score      ON mentions TYPE option<float>; -- confidence score from NER


-- 9. TAGGED_WITH (sentence -> topic|category)
-- -------------------------------------------------------
-- Only for system/AI classification of sentences.
-- User bookmarking is handled by alamah relation.
DEFINE TABLE tagged_with TYPE RELATION IN sentence | hadith OUT topic | category;
DEFINE FIELD weight     ON tagged_with TYPE int DEFAULT 5 ASSERT $value >= 1 AND $value <= 10;
DEFINE FIELD reasoning  ON tagged_with TYPE option<string>;
DEFINE FIELD created_at ON tagged_with TYPE datetime DEFAULT time::now();


-- 10. CONTAINS (majmu -> files)
-- -------------------------------------------------------
-- Links a majmu (folder) to its contents.
-- is_fork = true means a diverged copy was made (for faidah/sahifah).
DEFINE TABLE contains TYPE RELATION
  IN majmu
  OUT alamah | faidah | sahifah | bahs | majmu;

DEFINE FIELD is_fork    ON contains TYPE bool DEFAULT false;
DEFINE FIELD position   ON contains TYPE option<int>; -- ordering within folder
DEFINE FIELD created_at ON contains TYPE datetime DEFAULT time::now();


-- 11. COMPUTED FIELDS: Update popularity on category
-- -------------------------------------------------------
DEFINE FIELD popularity ON category VALUE (SELECT count() FROM tagged_with WHERE out = $parent.id);
