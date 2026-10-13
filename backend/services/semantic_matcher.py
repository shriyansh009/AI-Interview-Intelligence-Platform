"""
Semantic Matcher Service
========================
Provides semantic understanding of Job Descriptions (JD) and Resumes using:
  - Dense vector embeddings (sentence-transformers) for cosine similarity
  - LLM-based conceptual gap analysis (understanding meaning, not just keywords)
  - Skill taxonomy normalization (e.g. "ML" → "Machine Learning")
  - Weighted hybrid scoring combining keyword + semantic signals
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from services.embedding_service import get_embedding_service
from services.llm_service import get_llm_service


# ---------------------------------------------------------------------------
# Skill Synonym / Taxonomy Map
# Maps common aliases → canonical name so semantic matching recognises
# "k8s" == "kubernetes", "ML" == "machine learning", etc.
# ---------------------------------------------------------------------------
SKILL_SYNONYMS: Dict[str, str] = {
    # Cloud
    "aws": "amazon web services",
    "gcp": "google cloud platform",
    "azure": "microsoft azure",
    # Containers / Orchestration
    "k8s": "kubernetes",
    "kube": "kubernetes",
    "docker swarm": "docker",
    # ML / AI
    "ml": "machine learning",
    "dl": "deep learning",
    "nlp": "natural language processing",
    "cv": "computer vision",
    "genai": "generative ai",
    "llm": "large language models",
    "rl": "reinforcement learning",
    # Frameworks
    "tf": "tensorflow",
    "pt": "pytorch",
    "sk-learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "hf": "huggingface",
    "hugging face": "huggingface",
    "langchain": "langchain",
    # Languages
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "go": "golang",
    "c sharp": "c#",
    "dotnet": ".net",
    ".net core": ".net",
    # Databases
    "pg": "postgresql",
    "postgres": "postgresql",
    "mongo": "mongodb",
    # APIs / Protocols
    "rest": "rest api",
    "restful": "rest api",
    "graphql api": "graphql",
    # DevOps
    "ci cd": "ci/cd",
    "cicd": "ci/cd",
    "github actions": "ci/cd",
    "jenkins": "ci/cd",
    # Frontend
    "reactjs": "react",
    "react.js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "nextjs": "next.js",
    "angularjs": "angular",
    # Misc
    "oop": "object-oriented programming",
    "ds": "data structures",
    "algo": "algorithms",
    "dsa": "data structures",
}


def normalize_skill(skill: str) -> str:
    """Lowercase + synonym-resolve a skill string."""
    lower = skill.lower().strip()
    return SKILL_SYNONYMS.get(lower, lower)


class SemanticMatcher:
    """
    Semantic JD ↔ Resume matcher.

    Scoring breakdown (configurable weights):
      - Semantic Embedding Similarity  40 %   (cosine sim of full-text embeddings)
      - Skill-Level Semantic Overlap   35 %   (per-skill embedding similarity)
      - Conceptual Gap LLM Score       25 %   (LLM rates conceptual alignment)
    """

    EMBED_WEIGHT = 0.40
    SKILL_SEM_WEIGHT = 0.35
    LLM_CONCEPT_WEIGHT = 0.25

    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.llm_service = get_llm_service()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compute_semantic_score(
        self,
        resume_text: str,
        jd_text: str,
        resume_skills: List[str],
        jd_skills: List[str],
    ) -> Dict[str, Any]:
        """
        Compute a semantic similarity score and produce rich insights.

        Returns a dict with:
          semantic_score          float   0-100
          embedding_similarity    float   0-1   (cosine sim of full docs)
          skill_semantic_matches  list    Skills semantically similar (not exact)
          conceptual_gaps         list    Concepts in JD not covered semantically
          semantic_insights       str     LLM narrative explaining the fit
          skill_categories        dict    Categorised skills: {category: [skills]}
        """
        # 1. Full-document embedding similarity
        embed_sim = self._full_doc_similarity(resume_text, jd_text)

        # 2. Per-skill semantic matching
        skill_sem_score, sem_matched, sem_gaps = self._skill_level_semantic_match(
            resume_skills, jd_skills
        )

        # 3. LLM conceptual gap analysis
        llm_concept_score, conceptual_gaps, semantic_insights = (
            self._llm_conceptual_analysis(resume_text, jd_text, jd_skills, sem_gaps)
        )

        # 4. Weighted composite
        semantic_score = (
            embed_sim * self.EMBED_WEIGHT * 100
            + skill_sem_score * self.SKILL_SEM_WEIGHT * 100
            + llm_concept_score * self.LLM_CONCEPT_WEIGHT * 100
        )
        semantic_score = round(max(5.0, min(98.0, semantic_score)), 1)

        # 5. Skill taxonomy categorisation
        skill_categories = self._categorize_skills(jd_skills, resume_skills)

        return {
            "semantic_score": semantic_score,
            "embedding_similarity": round(embed_sim, 4),
            "skill_semantic_matches": sem_matched,
            "conceptual_gaps": conceptual_gaps,
            "semantic_insights": semantic_insights,
            "skill_categories": skill_categories,
        }

    def compute_hybrid_ats_score(
        self,
        deterministic_score: float,
        semantic_score: float,
        deterministic_weight: float = 0.55,
        semantic_weight: float = 0.45,
    ) -> float:
        """
        Blend keyword-based deterministic ATS score with semantic score.
        Default: 55% deterministic + 45% semantic.
        """
        hybrid = deterministic_score * deterministic_weight + semantic_score * semantic_weight
        return round(max(5.0, min(98.0, hybrid)), 1)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _full_doc_similarity(self, text_a: str, text_b: str) -> float:
        """Cosine similarity between the two full documents."""
        # Truncate to ~2 000 chars to keep embedding fast & relevant
        a = text_a[:2000]
        b = text_b[:2000]
        try:
            embeddings = self.embedding_service.encode([a, b])
            if len(embeddings) < 2:
                return 0.5
            vec_a = embeddings[0]
            vec_b = embeddings[1]
            return float(_cosine_similarity(vec_a, vec_b))
        except Exception:
            return 0.5

    def _skill_level_semantic_match(
        self,
        resume_skills: List[str],
        jd_skills: List[str],
        threshold: float = 0.65,
    ) -> Tuple[float, List[str], List[str]]:
        """
        For each JD skill not exactly matched, check if a resume skill is
        semantically similar (cosine ≥ threshold).

        Returns:
          score           float 0-1
          sem_matched     list of "(jd_skill ≈ resume_skill)" annotations
          sem_gaps        list of JD skills with no semantic match at all
        """
        if not jd_skills:
            return 0.7, [], []

        norm_resume = {normalize_skill(s) for s in resume_skills}
        norm_jd = [normalize_skill(s) for s in jd_skills]

        sem_matched: List[str] = []
        sem_gaps: List[str] = []

        # Encode all skills once for efficiency
        all_texts = norm_jd + list(norm_resume)
        try:
            all_embeddings = self.embedding_service.encode(all_texts)
        except Exception:
            return 0.5, [], list(jd_skills)

        jd_embeds = all_embeddings[: len(norm_jd)]
        res_embeds = all_embeddings[len(norm_jd) :]

        matched_count = 0
        for i, jd_skill_norm in enumerate(norm_jd):
            # Exact match already counted by deterministic scorer — credit it
            if jd_skill_norm in norm_resume:
                matched_count += 1
                continue

            # Semantic match
            best_sim = 0.0
            best_res_skill = ""
            for j, res_skill_norm in enumerate(norm_resume):
                sim = _cosine_similarity(jd_embeds[i], res_embeds[j])
                if sim > best_sim:
                    best_sim = sim
                    best_res_skill = res_skill_norm

            if best_sim >= threshold:
                matched_count += 0.75  # partial credit for semantic match
                original_jd = jd_skills[i] if i < len(jd_skills) else jd_skill_norm
                sem_matched.append(
                    f"{original_jd.title()} ≈ {best_res_skill.title()} ({best_sim:.0%})"
                )
            else:
                original_jd = jd_skills[i] if i < len(jd_skills) else jd_skill_norm
                sem_gaps.append(original_jd.title())

        score = matched_count / max(1, len(norm_jd))
        return min(1.0, score), sem_matched, sem_gaps

    def _llm_conceptual_analysis(
        self,
        resume_text: str,
        jd_text: str,
        jd_skills: List[str],
        semantic_gaps: List[str],
    ) -> Tuple[float, List[str], str]:
        """
        Use LLM to:
          1. Identify conceptual gaps (things the JD needs but resume lacks semantically)
          2. Rate the overall conceptual alignment 0-10
          3. Generate a narrative insight paragraph
        Returns (normalized_score_0_1, gap_list, insight_text)
        """
        system_prompt = (
            "You are an expert ATS and technical recruiter AI. "
            "Analyse the semantic alignment between a resume and a job description. "
            "Go BEYOND keyword matching — understand the meaning, context, and intent. "
            "Return valid JSON with these exact keys:\n"
            '{\n'
            '  "conceptual_score": <integer 0-10>,\n'
            '  "conceptual_gaps": ["<concept the JD needs but resume lacks>"],\n'
            '  "transferable_strengths": ["<strength that addresses JD needs implicitly>"],\n'
            '  "semantic_insight": "<2-3 sentence narrative about the semantic fit>"\n'
            "}"
        )

        gap_summary = ", ".join(semantic_gaps[:15]) if semantic_gaps else "None identified"
        prompt = (
            f"JOB DESCRIPTION (first 1500 chars):\n{jd_text[:1500]}\n\n"
            f"RESUME (first 1500 chars):\n{resume_text[:1500]}\n\n"
            f"Skills in JD not yet semantically matched: {gap_summary}\n\n"
            "Analyse deeply and return the JSON."
        )

        result = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(result, dict):
            result = {}

        raw_score = result.get("conceptual_score", 5)
        try:
            raw_score = float(raw_score)
        except (TypeError, ValueError):
            raw_score = 5.0
        normalized = raw_score / 10.0

        gaps = result.get("conceptual_gaps", [])
        if not isinstance(gaps, list):
            gaps = []
        gaps = [str(g) for g in gaps[:10]]

        insight = result.get("semantic_insight", "")
        if not isinstance(insight, str):
            insight = ""

        transferable = result.get("transferable_strengths", [])
        if isinstance(transferable, list) and transferable:
            insight += " Transferable strengths: " + "; ".join(str(t) for t in transferable[:3]) + "."

        return normalized, gaps, insight.strip()

    def _categorize_skills(
        self, jd_skills: List[str], resume_skills: List[str]
    ) -> Dict[str, List[str]]:
        """
        Group JD skills into high-level categories using LLM.
        Returns dict like:
          {"Programming Languages": ["Python", "Go"], "Cloud": ["AWS"], ...}
        """
        if not jd_skills:
            return {}

        system_prompt = (
            "You are a technical skill taxonomy expert. "
            "Group the provided skills into meaningful categories. "
            "Use categories like: Programming Languages, Frameworks & Libraries, "
            "Cloud & Infrastructure, Databases, AI/ML, DevOps & CI/CD, "
            "Architecture & Design, Soft Skills, Domain Knowledge. "
            "Return valid JSON: {\"<Category>\": [\"skill1\", \"skill2\"]}"
        )
        prompt = f"Skills to categorize: {', '.join(jd_skills[:40])}"

        result = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(result, dict):
            return {}

        # Clean up: only keep str keys with list values
        cleaned: Dict[str, List[str]] = {}
        for cat, skills in result.items():
            if isinstance(cat, str) and isinstance(skills, list):
                cleaned[cat] = [str(s) for s in skills if s]
        return cleaned


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Pure-Python cosine similarity (embeddings are already L2-normalised)."""
    if not vec_a or not vec_b:
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_default_semantic_matcher: Optional[SemanticMatcher] = None


def get_semantic_matcher() -> SemanticMatcher:
    global _default_semantic_matcher
    if _default_semantic_matcher is None:
        _default_semantic_matcher = SemanticMatcher()
    return _default_semantic_matcher
