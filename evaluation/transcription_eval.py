import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from services.evaluation_service import EvaluationService


def evaluate_transcription(dataset_path: str) -> dict:
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    wer_scores = []
    cer_scores = []

    for item in data:
        ref = item["reference_transcript"]
        hyp = item["hypothesis_transcript"]

        wer = EvaluationService.calculate_wer(ref, hyp)
        cer = EvaluationService.calculate_cer(ref, hyp)

        wer_scores.append(wer)
        cer_scores.append(cer)

    return {
        "word_error_rate_wer": round(sum(wer_scores) / len(wer_scores), 4),
        "character_error_rate_cer": round(sum(cer_scores) / len(cer_scores), 4),
    }


if __name__ == "__main__":
    path = os.path.join(os.path.dirname(__file__), "datasets", "transcription.json")
    results = evaluate_transcription(path)
    print("=== Transcription Evaluation Benchmark ===")
    for k, v in results.items():
        print(f"{k.upper()}: {v * 100:.2f}%")
