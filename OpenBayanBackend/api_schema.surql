-- Define a read-only user for frontend applications
DEFINE USER frontend_api ON DATABASE PASSWORD 'openbayan_readonly' ROLES VIEWER;

-- Define a function to get dictionary definitions for a specific word
DEFINE FUNCTION OVERWRITE fn::get_word_info($word_text: string) {
    LET $w_id = type::record("word", $word_text);
    RETURN SELECT 
        id, 
        text, 
        root, 
        <-defines<-sentence.{text, source, chunk_index} AS definitions 
    FROM $w_id;
};

-- Define a function to get all words and definitions related to a specific Arabic root
DEFINE FUNCTION OVERWRITE fn::get_root_network($root_text: string) {
    LET $r_id = type::record("root", $root_text);
    RETURN SELECT 
        id, 
        arabic_root,
        (SELECT id, text, <-defines<-sentence.{text, source} AS definitions FROM word WHERE root = $r_id) AS words 
    FROM $r_id;
};

-- Define a function to get the network of teachers and students for a specific narrator/scholar
DEFINE FUNCTION OVERWRITE fn::get_scholar_network($entity_id: string) {
    LET $e_id = type::record("entity", $entity_id);
    RETURN SELECT 
        id, 
        name, 
        type,
        reliability, 
        summary,
        biographical_notes,
        <-narrated_to<-entity.{id, name, reliability} AS teachers,
        ->narrated_to->entity.{id, name, reliability} AS students,
        <-mentions<-book_page.{id, source, chunk_index} AS mentioned_in_pages
    FROM $e_id;
};

-- Define a function to search sentences using full-text BM25 index
DEFINE FUNCTION OVERWRITE fn::search_sentences($query_text: string) {
    RETURN SELECT 
        id, 
        text, 
        source.title AS source_title,
        search::score(1) AS score
    FROM sentence 
    WHERE text @@ $query_text
    ORDER BY score DESC LIMIT 20;
};

-- Define a function to get full graph context for a specific sentence
DEFINE FUNCTION OVERWRITE fn::get_sentence_context($sentence_id: string) {
    LET $s_id = type::record("sentence", $sentence_id);
    RETURN SELECT 
        id, 
        text, 
        source.title AS source_title,
        ->defines->word.{id, text} AS defined_words,
        ->mentions->entity.{id, name, type} AS mentioned_entities
    FROM $s_id FETCH source;
};
