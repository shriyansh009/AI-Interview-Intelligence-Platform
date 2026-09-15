import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from retrieval_eval import evaluate_retrieval
from rag_eval import evaluate_rag
from transcription_eval import evaluate_transcription
from ats_eval import evaluate_ats
from interview_eval import evaluate_interview_quality
from performance_eval import evaluate_system_latencies


def generate_evaluation_report():
    base_dir = os.path.dirname(__file__)
    retrieval_data = os.path.join(base_dir, "datasets", "retrieval.json")
    rag_data = os.path.join(base_dir, "datasets", "rag_qa.json")
    trans_data = os.path.join(base_dir, "datasets", "transcription.json")
    ats_data = os.path.join(base_dir, "datasets", "resume_jd.json")

    report = {
        "retrieval": evaluate_retrieval(retrieval_data),
        "rag_generation": evaluate_rag(rag_data),
        "transcription": evaluate_transcription(trans_data),
        "resume_intelligence": evaluate_ats(ats_data),
        "interview_quality": evaluate_interview_quality(),
        "performance": evaluate_system_latencies(),
    }

    report_path = os.path.join(base_dir, "evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Evaluation report written successfully to {report_path}")
    print("\n" + json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    generate_evaluation_report()
