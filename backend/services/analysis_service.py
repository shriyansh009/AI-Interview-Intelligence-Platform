import json
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from services.embedding_service import get_embedding_service
from services.llm_service import get_llm_service
from services.resume_service import COMMON_TECH_SKILLS, get_resume_service
from services.semantic_matcher import get_semantic_matcher


class AnalysisService:
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.llm_service = get_llm_service()
        self.resume_service = get_resume_service()
        self.semantic_matcher = get_semantic_matcher()

    def parse_job_description(self, jd_text: str) -> Dict[str, Any]:
        """Extract title, required skills, preferred skills, and responsibilities from JD."""
        deterministic_skills = self.resume_service.extract_deterministic_skills(jd_text)

        system_prompt = (
            "You are an expert technical recruiter analyzing a job description. "
            "Extract structured information and return valid JSON matching: "
            '{"title": "...", "required_skills": ["..."], "preferred_skills": ["..."], "responsibilities": ["..."]}'
        )
        prompt = f"Job Description:\n{jd_text[:]}"
        parsed = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(parsed, dict):
            parsed = {}

        req_skills = [s.strip().title() for s in parsed.get("required_skills", []) if isinstance(s, str)]
        pref_skills = [s.strip().title() for s in parsed.get("preferred_skills", []) if isinstance(s, str)]

        # Merge with deterministic skills
        all_jd_skills = set(req_skills + pref_skills + deterministic_skills)
        if not req_skills:
            req_skills = deterministic_skills

        return {
            "title": parsed.get("title", "Target Job"),
            "required_skills": sorted(list(set(req_skills))),
            "preferred_skills": sorted(list(set(pref_skills))),
            "responsibilities": parsed.get("responsibilities", []),
            "all_skills": sorted(list(all_jd_skills)),
        }

    def compute_deterministic_ats_score(
        self,
        resume_skills: List[str],
        jd_skills: List[str],
        resume_text: str,
        jd_text: str
    ) -> Tuple[float, List[str], List[str], List[str]]:
        """
        Calculates a deterministic ATS match score (0-100) using a verifiable rubric:
        1. Skill Match Ratio (50% weight): proportion of required JD skills present in resume.
        2. Keyword Token Overlap (30% weight): Jaccard similarity of non-stopword tokens.
        3. Experience & Structure presence (20% weight): presence of core resume sections.
        """
        norm_res_skills = {s.lower() for s in resume_skills}
        norm_jd_skills = {s.lower() for s in jd_skills}

        matched = []
        missing = []
        partial = []

        if norm_jd_skills:
            for skill in norm_jd_skills:
                if skill in norm_res_skills:
                    matched.append(skill.title())
                else:
                    # Check partial/substring match
                    found_partial = any(skill in rs or rs in skill for rs in norm_res_skills)
                    if found_partial:
                        partial.append(skill.title())
                    else:
                        missing.append(skill.title())
            skill_score = (len(matched) * 1.0 + len(partial) * 0.5) / max(1, len(norm_jd_skills))
        else:
            skill_score = 0.7

        # 2. Token overlap (Jaccard similarity)
        def get_tokens(text: str) -> Set[str]:
            stopwords = {"the", "and", "in", "to", "of", "a", "with", "for", "is", "on", "that", "by", "this", "an", "be"}
            words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
            return {w for w in words if w not in stopwords}

        res_tokens = get_tokens(resume_text)
        jd_tokens = get_tokens(jd_text)
        if jd_tokens:
            token_overlap = len(res_tokens.intersection(jd_tokens)) / max(1, len(jd_tokens))
        else:
            token_overlap = 0.5

        # 3. Resume completeness structure score
        lower_res = resume_text.lower()
        structure_pts = 0
        if any(h in lower_res for h in ["experience", "employment", "work history"]):
            structure_pts += 0.08
        if any(h in lower_res for h in ["education", "degree", "university", "college"]):
            structure_pts += 0.06
        if any(h in lower_res for h in ["skills", "technologies", "tech stack"]):
            structure_pts += 0.06

        final_score = (skill_score * 50.0) + (token_overlap * 30.0) + (structure_pts * 100.0)
        final_score = round(max(5.0, min(98.0, final_score)), 1)

        return final_score, sorted(matched), sorted(missing), sorted(partial)

    def generate_analysis(
        self,
        resume_text: str,
        resume_skills: List[str],
        jd_text: str
    ) -> Dict[str, Any]:
        """
        Perform full ATS and Skill Gap analysis with semantic understanding.

        Combines:
          - Deterministic keyword/token matching (55% weight)
          - Semantic embedding similarity + LLM conceptual analysis (45% weight)
        """
        parsed_jd = self.parse_job_description(jd_text)
        jd_skills = parsed_jd["all_skills"]
        if not jd_skills:
            jd_skills = self.resume_service.extract_deterministic_skills(jd_text)

        # ── Step 1: Deterministic ATS score ──────────────────────────────────
        det_score, matched, missing, partial = self.compute_deterministic_ats_score(
            resume_skills=resume_skills,
            jd_skills=jd_skills,
            resume_text=resume_text,
            jd_text=jd_text
        )

        # ── Step 2: Semantic analysis ─────────────────────────────────────────
        semantic_result = self.semantic_matcher.compute_semantic_score(
            resume_text=resume_text,
            jd_text=jd_text,
            resume_skills=resume_skills,
            jd_skills=jd_skills,
        )

        # ── Step 3: Hybrid ATS score ──────────────────────────────────────────
        hybrid_score = self.semantic_matcher.compute_hybrid_ats_score(
            deterministic_score=det_score,
            semantic_score=semantic_result["semantic_score"],
        )

        # ── Step 4: LLM improvement suggestions (informed by semantic gaps) ───
        system_prompt = (
            "You are an expert career coach and ATS optimization specialist. "
            "Based on the matched skills, missing skills, semantic gaps, and conceptual analysis, "
            "provide 4-6 concrete, actionable suggestions for the candidate to tailor their resume. "
            "Focus on MEANING and context — not just keyword stuffing. "
            "Return valid JSON matching: "
            '{"suggestions": ["..."]}'
        )

        conceptual_gaps_str = ", ".join(semantic_result.get("conceptual_gaps", [])[:8])
        sem_insights = semantic_result.get("semantic_insights", "")

        prompt = (
            f"ATS Score: {hybrid_score}% (Keyword Match: {det_score}%, Semantic Match: {semantic_result['semantic_score']}%)\n"
            f"Matched Skills: {', '.join(matched)}\n"
            f"Missing Skills (keyword): {', '.join(missing)}\n"
            f"Semantic Gaps (conceptual): {conceptual_gaps_str}\n"
            f"Semantic Insight: {sem_insights}\n"
            f"Target Job Description:\n{jd_text[:2500]}"
        )
        suggestions_data = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        suggestions = suggestions_data.get("suggestions", []) if isinstance(suggestions_data, dict) else []
        if not suggestions:
            suggestions = [
                f"Highlight practical project experience with: {s}" for s in missing[:3]
            ]

        return {
            # ── Core scores
            "ats_score": hybrid_score,
            "deterministic_score": det_score,
            "semantic_score": semantic_result["semantic_score"],
            "embedding_similarity": semantic_result["embedding_similarity"],

            # ── Skill matching
            "matching_skills": matched,
            "missing_skills": missing,
            "partial_skills": partial,
            "skill_semantic_matches": semantic_result.get("skill_semantic_matches", []),

            # ── Semantic intelligence
            "conceptual_gaps": semantic_result.get("conceptual_gaps", []),
            "semantic_insights": semantic_result.get("semantic_insights", ""),
            "skill_categories": semantic_result.get("skill_categories", {}),

            # ── JD metadata
            "suggestions": suggestions,
            "job_title": parsed_jd.get("title", "Target Job"),
            "required_skills": parsed_jd.get("required_skills", []),
            "preferred_skills": parsed_jd.get("preferred_skills", []),
            "responsibilities": parsed_jd.get("responsibilities", []),
        }

    def index_job_description(self, user_id: int, jd_id: int, text: str):
        """Chunk and index job description into user's ChromaDB collection."""
        collection_name = f"jd_{user_id}"
        chunks = self.embedding_service.split_text(text, chunk_size=400, overlap=80)
        metadatas = [
            {
                "source_type": "job_description",
                "user_id": user_id,
                "jd_id": jd_id,
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]
        ids = [f"jd_{jd_id}_chk_{i}" for i in range(len(chunks))]
        self.embedding_service.add_documents(
            collection_name=collection_name,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )


_default_analysis_service: Optional[AnalysisService] = None


def get_analysis_service() -> AnalysisService:
    global _default_analysis_service
    if _default_analysis_service is None:
        _default_analysis_service = AnalysisService()
    return _default_analysis_service
