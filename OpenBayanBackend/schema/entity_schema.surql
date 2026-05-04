-- ---------------------------------------------------------
-- OpenBayan: Entity & Mentions Schema (Hardened 3.0)
-- ---------------------------------------------------------

-- 1. ENTITY TABLE
-- Represents specific people, places, or objects mentioned in texts
DEFINE TABLE entity SCHEMAFULL;
DEFINE FIELD name ON entity TYPE string ASSERT !!$value;
DEFINE FIELD type ON entity TYPE string 
  ASSERT $value IN [
    'Divine', 'Celestial', 'Prophetic', 'Person', 'Group', 
    'Place', 'Scripture', 'Afterlife', 'Object', 'Event', 'Concept'
  ];
DEFINE FIELD created_at ON entity TYPE datetime DEFAULT time::now();
DEFINE INDEX entity_name ON entity FIELDS name UNIQUE;

-- 2. MENTIONS RELATION
-- Links sentences (Quran/Hadith) to the specific entities they mention
DEFINE TABLE mentions SCHEMAFULL TYPE RELATION IN sentence OUT entity ENFORCED;
DEFINE FIELD created_at ON mentions TYPE datetime DEFAULT time::now();

-- 3. ENTITY RELATION TO CATEGORY
-- Bridges the gap: Entity -> Category (e.g., "Prophet Muhammad" -> "Prophethood")
DEFINE TABLE entity_tagged_with SCHEMAFULL TYPE RELATION IN entity OUT category ENFORCED;
DEFINE FIELD weight      ON entity_tagged_with TYPE int DEFAULT 5 ASSERT $value >= 1 AND $value <= 10;
DEFINE FIELD created_at  ON entity_tagged_with TYPE datetime DEFAULT time::now();

