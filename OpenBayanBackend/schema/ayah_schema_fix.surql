-- 6. RAW AYAH DATA (SCHEMALESS for flexible raw scraping)
REMOVE TABLE ayah;
DEFINE TABLE ayah SCHEMALESS;
DEFINE FIELD surah_number ON TABLE ayah TYPE int;
DEFINE FIELD ayah_number ON TABLE ayah TYPE int;
DEFINE FIELD created_at ON TABLE ayah TYPE datetime DEFAULT time::now();
DEFINE INDEX ayah_location ON TABLE ayah FIELDS surah_number, ayah_number UNIQUE;
