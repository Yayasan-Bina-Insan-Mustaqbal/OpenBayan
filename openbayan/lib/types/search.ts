export interface SearchPayload {
  success: boolean;
  data: {
    structuredContent: {
      query: string;
      processing_time_ms: number;
      category_clusters: {
        total_categories_found: number;
        items: CategoryCluster[];
      };
      sentence_results: {
        total_found: number;
        items: SentenceResult[];
      };
      entity_results: {
        total_found: number;
        items: EntityResult[];
      };
      root_word_results: {
        total_found: number;
        items: RootWordResult[];
      };
    };
  };
}

export interface CategoryCluster {
  category_name_ar: string;
  category_name_en: string;
  match_count: number;
  relevance_score: number;
  preview_sentence_ids: string[];
  related_queries: RelatedQuery[];
}

export interface RelatedQuery {
  query: string;
  match_reason: string;
}

export interface SentenceResult {
  id: string;
  resource_type: "quran" | "hadith" | "tafsir" | "fiqh" | "scholarly_book";
  parent_category: string;
  bab?: string;
  subchapter?: string;
  category_path: string[];
  content: Array<{
    type: "arabic" | "translation" | "transliteration";
    language?: string;
    text: string;
  }>;
  linguistics?: {
    irab: any[];
  } | null;
  citations: any[];
  citation: {
    source_book: string;
    chapter?: string;
    reference_number?: string;
    authenticity_grade: string;
  };
  hadith_anatomy?: {
    isnad?: string;
    matn?: string;
  } | null;
  relevance_score: number;
  mentioned_entities: Array<{
    entity_id: string;
    canonical_name: string;
    entity_type: string;
  }>;
  sniped_fragment?: string | null;
}

export interface EntityResult {
  entity_id: string;
  canonical_name: string;
  entity_type: string;
  description: string;
  wikipedia_url?: string;
  match_reason: string;
  relevance_score: number;
  related_graph_entities: any[];
}

export interface RootWordResult {
  root_id: string;
  root_value_ar: string;
  morphological_forms_found: string[];
  match_reason: string;
  relevance_score: number;
}
