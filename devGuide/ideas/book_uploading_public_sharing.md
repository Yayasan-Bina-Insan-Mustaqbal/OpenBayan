# [IDEA] Feature Expansion: Book Uploading & Public Sharing

> [!NOTE]
> This is a **planned feature expansion** and architectural proposal. It is not yet implemented in the current production stack but serves as the roadmap for handling large binary files natively in SurrealDB.

To allow users to upload books, share them, and have the AI extract Fawaid from them, we must handle large file binaries (PDFs, EPUBs). Instead of adding a heavy S3/MinIO container, we leverage SurrealDB's native file data type. This allows us to store the book's binary data directly alongside its Knowledge Graph metadata in the exact same database engine.

## 1. The Architecture of an Upload

Because SurrealDB can handle file streams natively, the upload flow becomes incredibly streamlined:

1.  **The Direct Upload**: React (Next.js) uses the `surrealdb.js` SDK to upload the PDF directly into a new `sahifah` record in SurrealDB.
2.  **The Trigger**: React tells FastAPI, "Upload complete for Sahifah ID X!"
3.  **The AI Factory**: FastAPI triggers the Prefect Python Worker.
4.  **The Extraction**: The Python worker pulls the binary file data directly out of SurrealDB into memory, extracts the text using `pdfplumber`, generates the vectors, and saves the extracted Fawaid back to the database.

## 2. Database Schema Update (SurrealDB Native Files)

We update the `sahifah` (Book/Document) table to use the new file data type. This allows the database to efficiently store binary blobs without corrupting standard JSON queries.

```surrealql
-- Update to existing Sahifah schema
DEFINE FIELD document  ON sahifah TYPE option<file>;
DEFINE FIELD file_name ON sahifah TYPE option<string>;
DEFINE FIELD mime_type ON sahifah TYPE option<string>; -- e.g., 'application/pdf'
DEFINE FIELD ai_status ON sahifah TYPE string DEFAULT "pending" 
    ASSERT $value IN ["pending", "processing", "completed", "failed"];

-- The is_public flag handles sharing. 
-- If is_public = true, anyone can query the `document` field to download the file.
```

## 3. Frontend Upload Logic (Next.js + SurrealDB SDK)

Because your Next.js app connects directly to SurrealDB using the user's NextAuth token, the frontend can stream the file straight to the database, completely bypassing FastAPI.

```tsx
// src/components/BookUploader.tsx
"use client";
import { useState } from "react";
import { Surreal } from "surrealdb.js";

export default function BookUploader({ db, userId }: { db: Surreal, userId: string }) {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    // 1. Convert the file to an ArrayBuffer (Binary data)
    const arrayBuffer = await file.arrayBuffer();

    // 2. Create the Sahifah record with the native file data
    const record = await db.create("sahifah", {
      title: file.name.replace(".pdf", ""),
      owner: `researcher:${userId}`,
      is_public: true,
      file_name: file.name,
      mime_type: file.type,
      document: arrayBuffer, // SurrealDB SDK automatically handles this as a file primitive!
      ai_status: "pending"
    });

    // 3. Tell FastAPI to trigger the Prefect AI Pipeline
    await fetch(`/api/trigger-ingestion`, {
      method: "POST",
      body: JSON.stringify({ sahifah_id: record[0].id })
    });
  };

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload}>Upload & Extract Fawaid</button>
    </div>
  );
}
```

## 4. The Python Worker (PDF Ingestion via SurrealDB)

When Prefect starts the job, the Python worker doesn't need `boto3` or S3 credentials. It just queries SurrealDB for the file bytes, processes them, and discards them from RAM.

```python
# notebooks/tasks/extract.py
from prefect import task, get_run_logger
from surrealdb import Surreal
import pdfplumber
import io
import os

@task(name="Extract Text from SurrealDB Native File")
async def extract_pdf_text(sahifah_id: str) -> str:
    logger = get_run_logger()
    
    # 1. Connect to SurrealDB
    async with Surreal(os.getenv("SURREAL_WS_URL")) as db:
        await db.signin({"user": "root", "pass": "root"})
        await db.use("bayan", "knowledge_graph")
        
        # 2. Fetch the record and its binary file payload
        result = await db.query(f"SELECT document FROM {sahifah_id}")
        file_bytes = result[0]["result"][0]["document"]
        
        if not file_bytes:
            raise ValueError("No file attached to this record.")

    # 3. Load the binary bytes directly into pdfplumber (No saving to disk needed!)
    extracted_text = ""
    
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
                
    logger.info(f"Successfully extracted {len(extracted_text)} characters.")
    
    # Now this text gets passed to your existing `clean_and_segment_arabic` task!
    return extracted_text
```

## 5. Public Library View (Downloading the File)

When a user visits the Public Library, you can serve the file back to them. FastAPI can act as a proxy to stream the file from SurrealDB to the user's browser, ensuring proper headers are set so it downloads as a PDF rather than a wall of binary text.

```python
# api/routes/library.py
from fastapi import APIRouter, Response, HTTPException
from surrealdb import Surreal

router = APIRouter()

@router.get("/api/library/download/{sahifah_id}")
async def download_book(sahifah_id: str):
    """Streams the native SurrealDB file to the user as a downloadable PDF."""
    
    # Use proper ID format
    full_id = f"sahifah:{sahifah_id}"
    
    async with Surreal("ws://surrealdb:8000/rpc") as db:
        await db.signin({"user": "root", "pass": "root"})
        await db.use("bayan", "knowledge_graph")
        
        result = await db.query(f"SELECT file_name, mime_type, document FROM {full_id} WHERE is_public = true")
        record = result[0]["result"]
        
        if not record or not record[0].get("document"):
            raise HTTPException(status_code=404, detail="File not found or private.")

    file_data = record[0]["document"]
    file_name = record[0]["file_name"]
    mime_type = record[0]["mime_type"]

    # Return as a downloadable file response
    return Response(
        content=file_data, 
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'}
    )
```

## Why this is a Massive Win for OpenBayan:

*   **True Minimal Stack**: You officially only have 3 containers (SurrealDB, Prefect, FastAPI) + 1 Node.js frontend. No MinIO overhead.
*   **Simplified Backups**: If you want to backup your server, you literally only have to back up the SurrealDB `/data` folder. Your relational data, vectors, graph edges, and PDF files are all safely contained inside it!
*   **No Disk I/O Bottlenecks**: The Python worker reads the file into a `BytesIO` memory stream. It never has to write a temporary file to a hard drive, making your AI extraction incredibly fast.
