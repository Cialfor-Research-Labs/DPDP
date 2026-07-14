import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

import httpx
import numpy as np

class EmbeddingsClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("VOYAGE_API_KEY")
        self._local_model = None

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self.api_key:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "input": texts,
                "model": "voyage-law-2"
            }
            try:
                response = httpx.post(
                    "https://api.voyageai.com/v1/embeddings",
                    json=payload,
                    headers=headers,
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    sorted_embeddings = sorted(data["data"], key=lambda x: x["index"])
                    return [item["embedding"] for item in sorted_embeddings]
                else:
                    raise RuntimeError(f"Voyage AI returned status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"Voyage AI Call failed: {e}. Falling back to local embedder.")

        try:
            if self._local_model is None:
                from sentence_transformers import SentenceTransformer
                self._local_model = SentenceTransformer("all-MiniLM-L6-v2")
                
            embeddings = self._local_model.encode(texts)
            if isinstance(embeddings, np.ndarray):
                return embeddings.tolist()
            return embeddings
        except Exception as e:
            print(f"Local SentenceTransformer loading failed: {e}. Falling back to deterministic offline Bag-of-Words embedder.")
            # Deterministic character-gram/word hashing vectorizer (384 dimensions)
            mock_embeddings = []
            for t in texts:
                vec = [0.0] * 384
                # Strip punctuation and lowercase
                clean_text = "".join(c if c.isalnum() or c.isspace() else " " for c in t.lower())
                words = clean_text.split()
                for w in words:
                    import hashlib
                    idx = int(hashlib.sha256(w.encode('utf-8')).hexdigest(), 16) % 384
                    vec[idx] += 1.0
                # L2 Normalize
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = (np.array(vec) / norm).tolist()
                mock_embeddings.append(vec)
            return mock_embeddings

class InMemoryVectorStore:
    def __init__(self):
        self.records: List[Dict[str, Any]] = []

    def add_obligation(self, ob_id: str, text: str, embedding: List[float], metadata: Dict[str, Any]):
        self.records.append({
            "id": ob_id,
            "text": text,
            "embedding": np.array(embedding, dtype=np.float32),
            "metadata": metadata
        })

    def add_chunk(self, chunk_id: str, text: str, embedding: List[float], metadata: Dict[str, Any]):
        self.records.append({
            "id": chunk_id,
            "text": text,
            "embedding": np.array(embedding, dtype=np.float32),
            "metadata": metadata
        })

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 3,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        if not self.records:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        
        results = []
        for r in self.records:
            if metadata_filter:
                matched = True
                for key, expected in metadata_filter.items():
                    if expected is None:
                        continue
                    if r["metadata"].get(key) != expected:
                        matched = False
                        break
                if not matched:
                    continue

            r_vec = r["embedding"]
            r_norm = np.linalg.norm(r_vec)
            
            if q_norm == 0 or r_norm == 0:
                similarity = 0.0
            else:
                similarity = np.dot(q_vec, r_vec) / (q_norm * r_norm)
                
            distance = 1.0 - float(similarity)
            
            results.append({
                "id": r["id"],
                "text": r["text"],
                "metadata": r["metadata"],
                "distance": distance
            })
            
        results.sort(key=lambda x: x["distance"])
        return results[:top_k]

class RetrievalMapper:
    DEFAULT_EMBEDDINGS_DIR = Path(__file__).resolve().parents[3] / "data" / "embeddings"

    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.environ.get("DATABASE_URL")
        self.embeddings_client = EmbeddingsClient()
        self.obligation_store = InMemoryVectorStore()
        self.document_store = InMemoryVectorStore()
        self._loaded_document_artifacts: set[str] = set()
        self._document_index_initialized = False

    def load_obligations(self, obligations: List[Dict[str, Any]]):
        """
        Embed and load obligations into the store.
        """
        texts_to_embed = []
        ob_mappings = []
        
        for o in obligations:
            checklist_items = []
            for item in o.get("evidence_checklist", []):
                if isinstance(item, dict):
                    checklist_items.append(item.get("item", ""))
                else:
                    checklist_items.append(getattr(item, "item", ""))
            checklist_str = " ".join(checklist_items)
            context = f"{o.get('section_citation')} {o.get('id')}: {o.get('obligation_text')} Checklist: {checklist_str}"
            texts_to_embed.append(context)
            ob_mappings.append(o)
            
        embeddings = self.embeddings_client.embed(texts_to_embed)

        for o, emb in zip(ob_mappings, embeddings):
            self.obligation_store.add_obligation(
                ob_id=o["id"],
                text=o["obligation_text"],
                embedding=emb,
                metadata={
                    "section_citation": o.get("section_citation"),
                    "chapter": o.get("chapter")
                }
            )

    def retrieve(self, evidence_chunk: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Embeds the input chunk and returns top_k matching obligations.
        """
        query_emb = self.embeddings_client.embed([evidence_chunk])[0]
        return self.obligation_store.search(query_emb, top_k=top_k)

    def load_document_artifact(self, artifact: Dict[str, Any]) -> int:
        """
        Load precomputed chunk embeddings from a document artifact JSON payload.
        Returns the number of chunks indexed.
        """
        audit_id = artifact.get("audit_id") or artifact.get("source_file_name") or "unknown"
        if audit_id in self._loaded_document_artifacts:
            return 0

        indexed = 0
        source_document_uri = artifact.get("source_document_uri")
        source_file_name = artifact.get("source_file_name")

        for chunk in artifact.get("chunks", []):
            chunk_id = chunk.get("chunk_id")
            text = chunk.get("text", "")
            if not chunk_id or not text:
                continue

            embedding = chunk.get("embedding")
            if not embedding:
                embedding = self.embeddings_client.embed([text])[0]

            self.document_store.add_chunk(
                chunk_id=chunk_id,
                text=text,
                embedding=embedding,
                metadata={
                    "audit_id": chunk.get("audit_id", audit_id),
                    "source_document_uri": source_document_uri,
                    "source_file_name": source_file_name,
                    "page_start": chunk.get("page_start"),
                    "page_end": chunk.get("page_end"),
                    "section": chunk.get("section"),
                    "clause_ref": chunk.get("clause_ref"),
                    "chunk_type": chunk.get("chunk_type"),
                    "confidence": chunk.get("confidence"),
                }
            )
            indexed += 1

        self._loaded_document_artifacts.add(audit_id)
        return indexed

    def load_document_artifact_from_path(self, artifact_path: str) -> int:
        path = Path(artifact_path)
        if not path.exists():
            return 0

        with path.open("r", encoding="utf-8") as f:
            artifact = json.load(f)
        return self.load_document_artifact(artifact)

    def load_document_artifacts_from_directory(self, directory: Optional[str] = None, refresh: bool = False) -> int:
        """
        Load every document embedding artifact in a directory.
        """
        if self._document_index_initialized and not refresh:
            return 0

        source_dir = Path(directory) if directory else self.DEFAULT_EMBEDDINGS_DIR
        if not source_dir.exists():
            self._document_index_initialized = True
            return 0

        if refresh:
            self.document_store = InMemoryVectorStore()
            self._loaded_document_artifacts.clear()

        total_indexed = 0
        for artifact_path in sorted(source_dir.glob("*.json")):
            total_indexed += self.load_document_artifact_from_path(str(artifact_path))

        self._document_index_initialized = True
        return total_indexed

    def search_document_chunks(
        self,
        query_text: str,
        top_k: int = 3,
        audit_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search precomputed document chunk embeddings.
        """
        if not self._document_index_initialized:
            self.load_document_artifacts_from_directory()

        if not self.document_store.records:
            return []

        query_emb = self.embeddings_client.embed([query_text])[0]
        metadata_filter = {"audit_id": audit_id} if audit_id else None
        return self.document_store.search(query_emb, top_k=top_k, metadata_filter=metadata_filter)


_DEFAULT_RETRIEVAL_MAPPER: Optional[RetrievalMapper] = None


def get_retrieval_mapper() -> RetrievalMapper:
    global _DEFAULT_RETRIEVAL_MAPPER
    if _DEFAULT_RETRIEVAL_MAPPER is None:
        _DEFAULT_RETRIEVAL_MAPPER = RetrievalMapper()
    return _DEFAULT_RETRIEVAL_MAPPER
