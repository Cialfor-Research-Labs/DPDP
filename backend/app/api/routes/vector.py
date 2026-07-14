from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.modules.vector.service import get_retrieval_mapper

router = APIRouter()


class VectorSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=3, ge=1, le=10)


@router.post("/load")
async def load_embedding_index() -> dict[str, Any]:
    """
    Load precomputed document embeddings from backend/data/embeddings into memory.
    """
    mapper = get_retrieval_mapper()
    loaded = mapper.load_document_artifacts_from_directory()
    return {
        "loaded_chunks": loaded,
        "indexed_chunks": len(mapper.document_store.records),
    }


@router.post("/search")
async def search_embeddings(req: VectorSearchRequest) -> dict[str, Any]:
    """
    Search across the loaded document chunk embeddings.
    """
    mapper = get_retrieval_mapper()
    results = mapper.search_document_chunks(req.query, top_k=req.top_k)
    return {
        "query": req.query,
        "top_k": req.top_k,
        "results": results,
    }
