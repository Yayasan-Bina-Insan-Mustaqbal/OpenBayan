# [IDEA] Architecture: Book Verification & Text Integrity

> [!NOTE]
> This is a **planned feature expansion** focused on data quality and textual authenticity. It outlines the strategy for ensuring that uploaded texts are accurate, verified, and free from the common encoding errors found in Arabic PDF extraction.

Because OpenBayan deals with sacred and scholarly Islamic texts, we cannot blindly trust user uploads. Arabic PDF extraction is prone to severe encoding errors (reversed letters, disconnected characters), and OCR is too unreliable for automated ingestion. To ensure absolute authenticity, every uploaded book enters a Verification Pipeline that enforces strict native-text extraction, algorithmic integrity checks, and a "Quarantine" workflow.

## 1. The Strict Native Text Policy (No OCR)

By default, OpenBayan rejects image-based scanned PDFs. The system will only automatically process "born-digital" documents (EPUB, Word, TXT, or PDFs with embedded text layers).

### The Pre-Flight Check (FastAPI)

When a user uploads a PDF, FastAPI does a rapid 1-second check before accepting the file:

```python
import fitz # PyMuPDF

def is_native_text_pdf(file_bytes: bytes) -> bool:
    """Checks if a PDF actually contains extractable text, or is just scanned images."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    
    # Check just the first 5 pages for text
    text_length = sum(len(page.get_text()) for page in doc.pages(0, min(5, len(doc))))
    
    # If there are less than 100 characters of text across 5 pages, it's a scanned image.
    return text_length > 100
```

If this fails, the frontend tells the user: *"Scanned images are not supported to ensure accuracy. Please upload a native text PDF, EPUB, or Word document."*

## 2. Database Schema: The Quarantine State

Books uploaded by users do not go straight to the Public Library. They go into Quarantine.

```surrealql
-- Update to existing Sahifah schema
DEFINE FIELD integrity_score ON sahifah TYPE option<float>;
DEFINE FIELD verification_status ON sahifah TYPE string DEFAULT "quarantine" 
    ASSERT $value IN ["quarantine", "ai_verified", "human_approved", "rejected"];
    
-- Add a source origin to track trust level
DEFINE FIELD trust_origin ON sahifah TYPE string DEFAULT "user_upload"
    ASSERT $value IN ["user_upload", "verified_shamela", "verified_waqfeya"];
```

## 3. The Algorithmic Integrity Analysis (Prefect Task)

Once the text is extracted, the Prefect worker runs an Integrity Analysis to answer: *"Is this text right in the first place?"*

### Test A: The Gibberish & Encoding Check
Arabic PDFs frequently suffer from "Reverse Encoding" (e.g., extracting "م ل س" instead of "سلم").
- **How it works**: The Python worker takes a sample of 500 words and passes them through **CAMeL Tools**.
- **The Math**: If CAMeL tools cannot identify a valid 3-letter Arabic root (Jidhr) for more than 20% of the words, the text is flagged as corrupted.

### Test B: The Primary Source Cross-Reference (The "Takhrij" Test)
If the book quotes the Quran or Sahih Bukhari, it is cross-referenced against verified tables.
- **How it works**: The worker looks for patterns like `قال تعالى` or `عن رسول الله`.
- **The Math**: It extracts the next 10 words and runs an exact-match search against your pristine `quran` and `hadith` tables. Matches increase trust; typos decrease it.

### Test C: The Hash Whitelist (The "Shamela" Check)
- **How it works**: Maintain a background database of SHA-256 hashes for universally trusted digital books (e.g., Al-Maktaba Al-Shamela official releases).
- **The Math**: If the `file_hash` matches a Shamela verified hash, it instantly bypasses checks and becomes `ai_verified`.

## 4. The Verification Workflow

| Integrity Score | Action Taken | Resulting Status |
| :--- | :--- | :--- |
| **> 0.90** | Text is perfectly legible and quotes match known sources. | `ai_verified` (Auto-added to Library) |
| **0.50 - 0.89** | Text is readable, but contains typos or formatting errors. | `quarantine` (Requires Review) |
| **< 0.50** | Font encoding is broken or text is gibberish. | `rejected` (Deleted) |

## 5. The Frontend "Tashih" (Correction) UI

For books in `quarantine`, the community can help fix them via a "Suggest Edit" feature in the Scholar UI.

1.  **The Highlight**: A user highlights a word like `الحالق` (error) that should be `الخالق`.
2.  **The Suggestion**: A tooltip appears for "Suggest Correction".
3.  **The Database**: Creates a record in a `suggested_edits` table.
4.  **The Resolution**: If 3 high-reputation scholars suggest the same edit, the core text is updated and vectors are re-calculated.

## 6. Python Verification Code Snippet

```python
# tasks/verify.py
from prefect import task, get_run_logger
from camel_tools.morphology.analyzer import Analyzer
import re

analyzer = Analyzer()

@task(name="Text Integrity Analysis")
def analyze_text_integrity(extracted_text: str) -> float:
    logger = get_run_logger()
    
    # 1. Clean and tokenize a sample of the text
    words = re.findall(r'\b[\u0600-\u06FF]+\b', extracted_text[:5000])
    
    if not words:
        return 0.0 # No Arabic text found
        
    valid_words = 0
    total_words = len(words)
    
    # 2. Check how many words have valid Arabic morphological roots
    for word in words:
        analyses = analyzer.analyze(word)
        if analyses: # If CAMeL tools recognizes the word structure
            valid_words += 1
            
    # 3. Calculate Legibility Ratio
    legibility_ratio = valid_words / total_words
    logger.info(f"Text Legibility Score: {legibility_ratio * 100}%")
    
    return legibility_ratio
```
