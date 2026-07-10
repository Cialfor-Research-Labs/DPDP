# DPDPA Compliance Engine

DPDP audit and compliance scaffold for analyzing organization-submitted documents against the DPDP rule set.

## What the backend now does

- Accepts an audit request with a PDF path or `file://` URI
- Extracts PDF pages into structured JSON-like artifacts
- Breaks the document into clause-aware compliance chunks
- Generates embeddings for each chunk
- Creates review items for obligations, exceptions, and low-confidence text
- Stores a lightweight report summary in memory for retrieval

## Backend workflow

1. `POST /api/v1/audits`
2. PDF text is extracted using `pymupdf` or `pypdf`
3. Content is normalized into pages and chunks
4. Chunks are embedded using:
   - OpenAI embeddings if `EMBEDDING_PROVIDER=openai` and `OPENAI_API_KEY` is set
   - a deterministic local fallback otherwise
5. Review and report records are created from the ingested chunks
6. `GET /api/v1/audits`, `GET /api/v1/review/queue`, and `GET /api/v1/reports` expose the results

## File outputs

- `backend/data/artifacts/<audit_id>.json` stores the extracted PDF JSON structure
- `backend/data/embeddings/<audit_id>.json` stores chunk embeddings and chunk metadata

## Notes

- The repo keeps the existing folder structure and adds only the files needed for the ingestion pipeline.
- The in-memory repository is enough for local development and demos.
- If you want persistent storage later, the same service boundaries can be backed by Postgres, pgvector, and object storage without changing the API shape.
