import os
import shutil
from typing import Any, Dict, List, Optional, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from config import get_settings

settings = get_settings()


class EmbeddingService:
    """Service for embeddings and ChromaDB vector store operations."""

    def __init__(self, vector_dir: Optional[str] = None):
        self.vector_dir = vector_dir or settings.VECTOR_DB_DIR
        os.makedirs(self.vector_dir, exist_ok=True)
        self._model = None
        self._chroma_client = None

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._model

    @property
    def chroma_client(self) -> chromadb.PersistentClient:
        if self._chroma_client is None:
            self._chroma_client = chromadb.PersistentClient(path=self.vector_dir)
        return self._chroma_client

    def split_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        return splitter.split_text(text)

    def encode(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.tolist()

    def get_or_create_collection(self, collection_name: str):
        # Sanitize collection name for ChromaDB (alphanumeric, underscores, hyphens, 3-63 chars)
        safe_name = collection_name.replace(":", "_").replace("/", "_")[:63]
        if len(safe_name) < 3:
            safe_name = safe_name.ljust(3, "_")
        return self.chroma_client.get_or_create_collection(
            name=safe_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ):
        if not documents:
            return
        collection = self.get_or_create_collection(collection_name)
        embeddings = self.encode(documents)
        doc_ids = ids or [f"doc_{i}" for i in range(len(documents))]
        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=doc_ids
        )

    def query(
        self,
        collection_name: str,
        query_text: str,
        top_k: int = 5,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        try:
            collection = self.get_or_create_collection(collection_name)
            if collection.count() == 0:
                return []
            query_embedding = self.encode([query_text])[0]
            query_args = {
                "query_embeddings": [query_embedding],
                "n_results": min(top_k, collection.count()),
            }
            if where_filter:
                query_args["where"] = where_filter

            results = collection.query(**query_args)
            items = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)
                ids = results["ids"][0] if results.get("ids") else [""] * len(docs)

                for doc, meta, dist, doc_id in zip(docs, metas, dists, ids):
                    # Cosine distance to similarity (1 - distance)
                    similarity = max(0.0, min(1.0, 1.0 - float(dist)))
                    items.append({
                        "id": doc_id,
                        "text": doc,
                        "metadata": meta,
                        "similarity": similarity
                    })
            return items
        except Exception as e:
            print(f"[EmbeddingService Query Error]: {e}")
            return []

    def delete_collection(self, collection_name: str):
        try:
            safe_name = collection_name.replace(":", "_").replace("/", "_")[:63]
            self.chroma_client.delete_collection(safe_name)
        except Exception:
            pass


_default_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    global _default_embedding_service
    if _default_embedding_service is None:
        _default_embedding_service = EmbeddingService()
    return _default_embedding_service
