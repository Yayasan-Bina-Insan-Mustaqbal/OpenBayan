# Islamic Data Sources Guide (Kaggle & Hugging Face)

Bismillah. This guide lists potential high-quality sources for Quranic, Hadith, and Islamic scholarly data from Kaggle and Hugging Face. It evaluates their uniqueness and data quality to guide future ingestion and enrichment tasks.

## 1. Quran & Tafsir

| Source | Platform | Content | Uniqueness | Quality |
| :--- | :--- | :--- | :--- | :--- |
| **[MohamedRashad/Quran-Tafseer](https://huggingface.co/datasets/MohamedRashad/Quran-Tafseer)** | Hugging Face | 84 books of Tafsir in Arabic. | **Massive coverage.** The most comprehensive digital collection of classical interpretations. | **High.** Structured by surah/ayah. |
| **[tarteel-ai/quranqa](https://huggingface.co/datasets/tarteel-ai/quranqa)** | Hugging Face | Question-Answering pairs based on the Quran. | **AI/LLM Focused.** Specifically designed for training or evaluating Q&A models. | **Excellent.** Curated by Tarteel AI team. |
| **[Buraaq/quran-md-ayahs](https://huggingface.co/datasets/Buraaq/quran-md-ayahs)** | Hugging Face | Multimodal: Text + 30 Reciters. | **Audio-Linkage.** Perfect for features involving recitation and tajweed. | **High.** Clean metadata. |
| **[Quran with Tafsir](https://www.kaggle.com/datasets/al-mukhtasar-tafsir)** | Kaggle | Al-Mukhtasar fi Tafsir (2010). | **Modern & Concise.** Ideal for users looking for simplified, modern summaries. | **High.** Modern standard Arabic. |

## 2. Hadith & Sunnah

| Source | Platform | Content | Uniqueness | Quality |
| :--- | :--- | :--- | :--- | :--- |
| **[Sanadset](https://www.kaggle.com/datasets/sanadset-narrators)** | Kaggle | 650k+ records, Isnad (narrator chains). | **Graph-Ready.** The best source for building the Narrator/Scholar Knowledge Graph. | **Professional.** Designed for authenticity research. |
| **[meeAtif/hadith_datasets](https://huggingface.co/datasets/meeAtif/hadith_datasets)** | Hugging Face | Kutub al-Sittah (The Six Books). | **Multilingual.** Includes Arabic, English, and gradings (Sahih/Da'if). | **Standard.** Consistent structure. |
| **[Slepovichev/hadith-14-books](https://huggingface.co/datasets/Slepovichev/hadith-14-books-collection)** | Hugging Face | 50k+ narrations from 14 books. | **Breadth.** Goes beyond the standard six books to include Muwatta Malik, Musnad Ahmad, etc. | **High.** Bilingual. |

## 3. Fiqh, Aqidah & Fatwa

| Source | Platform | Content | Uniqueness | Quality |
| :--- | :--- | :--- | :--- | :--- |
| **[abdullah-alamodi/aqeedah-rag](https://huggingface.co/datasets/abdullah-alamodi/aqeedah-rag-dataset)** | Hugging Face | 5,419 paragraphs from classical Aqidah texts. | **RAG-Optimized.** Pre-chunked and curated for Retrieval-Augmented Generation. | **Scholarly.** Sourced from authoritative texts. |
| **[Fatwaset](https://www.kaggle.com/datasets/fatwaset)** | Kaggle | 130k fatwas from authoritative sites. | **Real-world Context.** Covers modern issues and legal rulings. | **Diverse.** Varied sources require normalization. |
| **[IslamicLegalBench](https://huggingface.co/datasets/IslamicLegalBench)** | Hugging Face | Multi-school (Madhhab) benchmark. | **Comparative Fiqh.** Includes Hanafi, Maliki, Shafi'i, Hanbali, and Shi'i perspectives. | **Technical.** High-depth reasoning tasks. |

## 4. Linguistic & Dictionary (Murad & Beyond)

### Murad Reverse Arabic Dictionary
*   **Source**: RIOTU Lab (found in `OpenBayanBackend/ingest_murad.py`).
*   **Role**: Serves as a "Reverse Dictionary" where definitions can lead to words.
*   **Quality**: Highly structured CSV format, but requires enrichment (see `enrich_dictionary_data.py`) to map to classical roots properly.
*   **Uniqueness**: Bridges modern dictionary structures with classical knowledge.

### Dictionary Functions in SurrealDB
OpenBayan implements several core functions for linguistic research:
- `fn::get_word_info($word_text)`: Retrieves definitions linked to a specific word.
- `fn::get_root_network($root_text)`: Maps the entire semantic tree of an Arabic root.
- `fn::get_sentence_context($sentence_id)`: Shows which words and entities are defined or mentioned in a specific text chunk.

## 5. Summary of Recommended Strategy
- **Ingestion**: Prioritize **MohamedRashad/Quran-Tafseer** for depth and **Sanadset** for the narrator graph.
- **Enrichment**: Use **CAMeL Tools** for morphological analysis of the Murad dataset to strengthen the Root-Word-Definition links.
- **Validation**: Use **IslamicMMLU** or **QuranQA** to verify the accuracy of the Knowledge Graph's search and reasoning capabilities.

Alhamdulillah.
