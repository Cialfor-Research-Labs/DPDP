import os
import httpx
import numpy as np
from typing import List, Dict, Any, Optional

class EmbeddingsClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("VOYAGE_API_KEY")
        self._local_model = None

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # If Voyage AI API key is present, use HTTP request to Voyage AI API
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
                    # Sort by index to maintain original order
                    sorted_embeddings = sorted(data["data"], key=lambda x: x["index"])
                    return [item["embedding"] for item in sorted_embeddings]
                else:
                    raise RuntimeError(f"Voyage AI returned status {response.status_code}: {response.text}")
            except Exception as e:
                # Fallback to local if API fails
                print(f"Voyage AI Call failed: {e}. Falling back to local SentenceTransformer.")

        # Local SentenceTransformer fallback (requires no keys)
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer("all-MiniLM-L6-v2")
            
        embeddings = self._local_model.encode(texts)
        if isinstance(embeddings, np.ndarray):
            return embeddings.tolist()
        return embeddings

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

    def search(self, query_embedding: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        if not self.records:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        
        results = []
        for r in self.records:
            r_vec = r["embedding"]
            r_norm = np.linalg.norm(r_vec)
            
            # Compute cosine similarity
            if q_norm == 0 or r_norm == 0:
                similarity = 0.0
            else:
                similarity = np.dot(q_vec, r_vec) / (q_norm * r_norm)
                
            # Cosine distance = 1.0 - cosine_similarity
            distance = 1.0 - float(similarity)
            
            results.append({
                "id": r["id"],
                "text": r["text"],
                "metadata": r["metadata"],
                "distance": distance
            })
            
        # Sort by distance ascending (closer is more similar)
        results.sort(key=lambda x: x["distance"])
        return results[:top_k]

class RetrievalMapper:
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.environ.get("DATABASE_URL")
        self.embeddings_client = EmbeddingsClient()
        # Fallback in-memory store
        self.store = InMemoryVectorStore()

    def load_obligations(self, obligations: List[Dict[str, Any]]):
        """
        Embed and load obligations into the store.
        """
        texts_to_embed = []
        ob_mappings = []
        
        for o in obligations:
            # Combine id, section, text, and checklist items to construct a rich context
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
            self.store.add_obligation(
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
        # In production, we would run a SQL query against Postgres:
        # SELECT id, text, (embedding <=> query_emb) as distance FROM obligations ORDER BY distance LIMIT top_k;
        # Here we route to our store:
        return self.store.search(query_emb, top_k=top_k)
