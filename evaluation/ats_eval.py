import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from services.evaluation_service import EvaluationService


def evaluate_ats(dataset_path: str) -> dict:
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    prec_list, rec_list, f1_list = [], [], []

    for item in data:
        exp = item["ground_truth_skills"]
        pred = item["predicted_skills"]

        f1_data = EvaluationService.calculate_skill_f1(exp, pred)
        prec_list.append(f1_data["precision"])
        rec_list.append(f1_data["recall"])
        f1_list.append(f1_data["f1"])

    return {
        "skill_precision": round(sum(prec_list) / len(prec_list), 4),
        "skill_recall": round(sum(rec_list) / len(rec_list), 4),
        "skill_f1": round(sum(f1_list) / len(f1_list), 4),
    }


if __name__ == "__main__":
    path = os.path.join(os.path.dirname(__file__), "datasets", "resume_jd.json")
    results = evaluate_ats(path)
    print("=== ATS & Skill Extraction Benchmark ===")
    for k, v in results.items():
        print(f"{k.upper()}: {v}")
