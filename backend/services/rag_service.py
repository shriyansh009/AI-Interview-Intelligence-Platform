import time
from typing import Any, Dict, List, Optional, Tuple

from services.embedding_service import get_embedding_service
from services.llm_service import get_llm_service
from services.video_service import get_video_service


class RAGService:
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.llm_service = get_llm_service()
        self.video_service = get_video_service()

    def search_video_transcripts(
        self,
        query: str,
        video_ids: List[int],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search across one or more video collections and return timestamped segments."""
        all_results = []
        for vid in video_ids:
            col_name = f"video_{vid}"
            items = self.embedding_service.query(col_name, query, top_k=top_k)
            for itm in items:
                meta = itm["metadata"]
                start_t = float(meta.get("start_time", 0.0))
                end_t = float(meta.get("end_time", 0.0))
                all_results.append({
                    "video_id": vid,
                    "video_title": meta.get("video_title", f"Video #{vid}"),
                    "chunk_id": itm["id"],
                    "text": itm["text"],
                    "start_time": start_t,
                    "end_time": end_t,
                    "timestamp_formatted": self.video_service.format_timestamp(start_t),
                    "similarity_score": itm["similarity"]
                })

        # Sort by similarity descending
        all_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return all_results[:top_k]

    def retrieve_multi_source(
        self,
        query: str,
        user_id: int,
        source_types: List[str],
        video_ids: Optional[List[int]] = None,
        top_k_per_source: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retrieves context chunks from multiple isolated collections:
        - Resume (`resume_{user_id}`)
        - Job Description (`jd_{user_id}`)
        - Videos (`video_{video_id}`)
        """
        citations = []

        # 1. Resume retrieval
        if "resume" in source_types:
            resume_items = self.embedding_service.query(f"resume_{user_id}", query, top_k=top_k_per_source)
            for itm in resume_items:
                citations.append({
                    "source_type": "resume",
                    "source_id": itm["metadata"].get("resume_id"),
                    "title": itm["metadata"].get("filename", "Resume"),
                    "section": f"Chunk {itm['metadata'].get('chunk_index', 0) + 1}",
                    "start_time": None,
                    "end_time": None,
                    "timestamp_formatted": None,
                    "text_snippet": itm["text"],
                    "similarity": round(itm["similarity"], 3)
                })

        # 2. Job description retrieval
        if "job_description" in source_types:
            jd_items = self.embedding_service.query(f"jd_{user_id}", query, top_k=top_k_per_source)
            for itm in jd_items:
                citations.append({
                    "source_type": "job_description",
                    "source_id": itm["metadata"].get("jd_id"),
                    "title": "Target Job Description",
                    "section": f"Requirement Section {itm['metadata'].get('chunk_index', 0) + 1}",
                    "start_time": None,
                    "end_time": None,
                    "timestamp_formatted": None,
                    "text_snippet": itm["text"],
                    "similarity": round(itm["similarity"], 3)
                })

        # 3. Video transcripts retrieval
        if "video" in source_types and video_ids:
            for vid in video_ids:
                v_items = self.embedding_service.query(f"video_{vid}", query, top_k=top_k_per_source)
                for itm in v_items:
                    meta = itm["metadata"]
                    start_t = float(meta.get("start_time", 0.0))
                    end_t = float(meta.get("end_time", 0.0))
                    citations.append({
                        "source_type": "video",
                        "source_id": vid,
                        "title": meta.get("video_title", f"Video #{vid}"),
                        "section": f"Segment [{self.video_service.format_timestamp(start_t)} - {self.video_service.format_timestamp(end_t)}]",
                        "start_time": start_t,
                        "end_time": end_t,
                        "timestamp_formatted": self.video_service.format_timestamp(start_t),
                        "text_snippet": itm["text"],
                        "similarity": round(itm["similarity"], 3)
                    })

        # Sort all citations by similarity score
        citations.sort(key=lambda x: x["similarity"], reverse=True)
        return citations

    def generate_grounded_answer(
        self,
        question: str,
        citations: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_instructions: Optional[str] = None
    ) -> str:
        """Synthesize a grounded answer using retrieved multi-source context."""
        context_blocks = []
        for i, c in enumerate(citations):
            header = f"[Source {i+1}: {c['source_type'].upper()} - {c['title']}"
            if c.get("timestamp_formatted"):
                header += f" @ {c['timestamp_formatted']}"
            header += "]"
            context_blocks.append(f"{header}\n{c['text_snippet']}")

        context_str = "\n\n".join(context_blocks) if context_blocks else "No relevant context found in repository."

        history_str = ""
        if conversation_history:
            h_lines = [f"{msg['role'].capitalize()}: {msg['content']}" for msg in conversation_history[-6:]]
            history_str = "\nRecent Conversation:\n" + "\n".join(h_lines) + "\n"

        system_prompt = (
            "You are an AI Interview Intelligence & Video Assistant. "
            "Your job is to provide accurate, concise, grounded answers using the provided multi-source context. "
            "Guidelines:\n"
            "- Ground your answer strictly in the provided sources.\n"
            "- When referencing videos, explicitly cite the video title and timestamp (e.g., 'In [Video Title] at 02:45').\n"
            "- When referencing the candidate's resume or job requirements, cite specific projects, skills, or bullet points.\n"
            "- If information is incomplete or absent, state what is missing honestly.\n"
            "- Use clean Markdown headers and bullet points for readability."
        )
        if system_instructions:
            system_prompt += f"\n{system_instructions}"

        prompt = (
            f"Context Information:\n{context_str}\n"
            f"{history_str}\n"
            f"User Question: {question}\n\n"
            f"Grounded Answer:"
        )

        return self.llm_service.generate(prompt, system_prompt=system_prompt, temperature=0.3)

    def query_rag(
        self,
        question: str,
        user_id: int,
        source_types: Optional[List[str]] = None,
        video_ids: Optional[List[int]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """End-to-end RAG pipeline execution."""
        start_time = time.time()
        sources = source_types or ["resume", "job_description", "video"]
        citations = self.retrieve_multi_source(
            query=question,
            user_id=user_id,
            source_types=sources,
            video_ids=video_ids,
            top_k_per_source=3
        )
        answer = self.generate_grounded_answer(
            question=question,
            citations=citations,
            conversation_history=conversation_history
        )
        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "question": question,
            "answer": answer,
            "sources": citations,
            "response_time_ms": duration_ms
        }


_default_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _default_rag_service
    if _default_rag_service is None:
        _default_rag_service = RAGService()
    return _default_rag_service
