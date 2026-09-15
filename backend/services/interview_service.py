import json
from typing import Any, Dict, List, Optional
from services.llm_service import get_llm_service


class InterviewService:
    def __init__(self):
        self.llm_service = get_llm_service()

    def generate_personalized_questions(
        self,
        resume_text: str,
        jd_text: str,
        matched_skills: List[str],
        missing_skills: List[str],
        question_types: Optional[List[str]] = None,
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized interview questions based on the candidate's resume,
        job requirements, and identified skill gaps.
        """
        types_str = ", ".join(question_types or ["technical", "behavioral", "hr", "system_design"])

        system_prompt = (
            "You are a Senior Principal Engineering Interviewer and Hiring Manager. "
            "Generate realistic, challenging, and personalized interview questions based on the candidate's actual projects, "
            "the target job description, and areas where the candidate has skill gaps. "
            "Categories can include: Technical, Behavioral, HR, System Design, or Project-Specific. "
            "Return valid JSON array matching: "
            '[{"question_type": "technical", "question_text": "...", "model_answer": "...", "category": "Project-specific"}]'
        )

        prompt = (
            f"Generate {count} questions covering types [{types_str}].\n\n"
            f"Candidate Resume Excerpt:\n{resume_text[:4000]}\n\n"
            f"Target Job Description:\n{jd_text[:3000]}\n\n"
            f"Matched Skills: {', '.join(matched_skills)}\n"
            f"Skill Gaps to probe: {', '.join(missing_skills)}\n"
        )

        questions = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(questions, list):
            questions = []

        # Fallback defaults if LLM did not return a valid list
        if not questions:
            questions = [
                {
                    "question_type": "technical",
                    "question_text": f"How have you applied {matched_skills[0] if matched_skills else 'core technologies'} in your past projects?",
                    "model_answer": "A strong answer should explain the architecture, challenges encountered, and measurable impact.",
                    "category": "Technical Experience"
                },
                {
                    "question_type": "behavioral",
                    "question_text": "Describe a situation where you had to quickly learn a new technology or domain to deliver a project on time.",
                    "model_answer": "The candidate should use the STAR method (Situation, Task, Action, Result).",
                    "category": "Behavioral"
                }
            ]

        return questions[:count]

    def evaluate_candidate_answer(
        self,
        question_text: str,
        model_answer: Optional[str],
        candidate_answer: str,
        question_type: str = "technical"
    ) -> Dict[str, Any]:
        """
        Evaluate candidate's response using rubric-based dimensions:
        - Technical Accuracy (1.0 - 10.0)
        - Relevance (1.0 - 10.0)
        - Completeness (1.0 - 10.0)
        - Clarity (1.0 - 10.0)
        - Confidence / Delivery (1.0 - 10.0)
        - Overall Score (1.0 - 10.0)
        """
        system_prompt = (
            "You are an expert interview evaluator. Evaluate the candidate's answer against the interview question and rubric. "
            "Provide quantitative ratings (1.0 to 10.0) and qualitative feedback. "
            "Return valid JSON matching: "
            '{"technical_accuracy": 8.0, "relevance": 8.5, "completeness": 7.5, "clarity": 8.0, "confidence": 8.0, '
            '"overall_score": 8.0, "strengths": ["..."], "weaknesses": ["..."], "missing_concepts": ["..."], '
            '"suggested_answer": "..."}'
        )

        prompt = (
            f"Question: {question_text}\n"
            f"Question Type: {question_type}\n"
            f"Expected Reference Answer: {model_answer or 'A comprehensive and structured explanation.'}\n\n"
            f"Candidate's Answer:\n{candidate_answer}\n"
        )

        evaluation = self.llm_service.generate_json(prompt, system_prompt=system_prompt)
        if not isinstance(evaluation, dict):
            evaluation = {}

        # Ensure safe bounded floats
        def safe_score(val, default=7.0):
            try:
                f = float(val)
                return round(max(1.0, min(10.0, f)), 1)
            except Exception:
                return default

        tech_acc = safe_score(evaluation.get("technical_accuracy"), 7.0)
        relevance = safe_score(evaluation.get("relevance"), 7.5)
        completeness = safe_score(evaluation.get("completeness"), 7.0)
        clarity = safe_score(evaluation.get("clarity"), 7.5)
        confidence = safe_score(evaluation.get("confidence"), 7.0)
        overall = safe_score(
            evaluation.get("overall_score"),
            round((tech_acc + relevance + completeness + clarity + confidence) / 5.0, 1)
        )

        return {
            "technical_accuracy": tech_acc,
            "relevance": relevance,
            "completeness": completeness,
            "clarity": clarity,
            "confidence": confidence,
            "overall_score": overall,
            "strengths": evaluation.get("strengths", ["Addressed the question directly."]),
            "weaknesses": evaluation.get("weaknesses", ["Could provide more concrete architectural detail."]),
            "missing_concepts": evaluation.get("missing_concepts", []),
            "suggested_answer": evaluation.get("suggested_answer", "See model answer.")
        }

    def generate_final_report(
        self,
        session_title: str,
        evaluations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Aggregate performance scores into an interview summary report."""
        if not evaluations:
            return {"overall_score": 0.0, "summary_feedback": "No answers submitted for evaluation."}

        avg_score = round(sum(e.get("overall_score", 0.0) for e in evaluations) / len(evaluations), 1)

        all_strengths = []
        all_weaknesses = []
        for e in evaluations:
            all_strengths.extend(e.get("strengths", []))
            all_weaknesses.extend(e.get("weaknesses", []))

        summary = (
            f"Completed {session_title} with an average rubric rating of {avg_score}/10. "
            f"Strongest points included: {', '.join(all_strengths[:3]) if all_strengths else 'Direct communication'}. "
            f"Recommended focus areas: {', '.join(all_weaknesses[:3]) if all_weaknesses else 'Continue practicing system design details'}."
        )

        return {
            "overall_score": avg_score,
            "summary_feedback": summary
        }


_default_interview_service: Optional[InterviewService] = None


def get_interview_service() -> InterviewService:
    global _default_interview_service
    if _default_interview_service is None:
        _default_interview_service = InterviewService()
    return _default_interview_service
