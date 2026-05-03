-- 6. RAW AYAH DATA
DEFINE TABLE ayah SCHEMAFULL;
DEFINE FIELD surah_number ON TABLE ayah TYPE int;
DEFINE FIELD ayah_number ON TABLE ayah TYPE int;
DEFINE FIELD juz ON TABLE ayah TYPE int;
DEFINE FIELD hizb_quarter ON TABLE ayah TYPE int;
DEFINE FIELD page ON TABLE ayah TYPE int;
DEFINE FIELD text_uthmani ON TABLE ayah TYPE string;
DEFINE FIELD text_simple ON TABLE ayah TYPE string;
DEFINE FIELD translations ON TABLE ayah TYPE object;
DEFINE FIELD tafsir ON TABLE ayah TYPE object;
DEFINE FIELD transliterations ON TABLE ayah TYPE object;
DEFINE FIELD created_at ON TABLE ayah TYPE datetime DEFAULT time::now();
DEFINE INDEX ayah_location ON TABLE ayah FIELDS surah_number, ayah_number UNIQUE;
