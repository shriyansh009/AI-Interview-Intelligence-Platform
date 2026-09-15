# System Evaluation & Metrics Framework

## 1. Overview

The platform includes a dedicated evaluation framework to quantitatively benchmark subsystem accuracy, model faithfulness, speech recognition precision, and API performance.

---

## 2. Implemented Evaluation Metrics

### A. Retrieval Metrics
- **Recall@K (K=1, 3, 5, 10):** Proportion of ground-truth relevant chunks retrieved in top-K results.
- **Precision@K (K=1, 3, 5, 10):** Proportion of top-K results that are relevant.
- **Mean Reciprocal Rank (MRR):** Average of reciprocal ranks of the first relevant document.
- **nDCG@5 / nDCG@10:** Normalized Discounted Cumulative Gain accounting for position decay.

### B. RAG Generation Metrics
- **Faithfulness:** Degree to which generated assertions are directly supported by retrieved source text.
- **Answer Relevance:** Direct semantic overlap and intent matching with user question.
- **Context Relevance:** Signal-to-noise ratio of retrieved passages.
- **Groundedness Score:** Verified citation fidelity.

### C. Speech-to-Text (Whisper) Metrics
- **Word Error Rate (WER):** Levenshtein edit distance between ground-truth and predicted transcripts.
- **Character Error Rate (CER):** Character-level error calculation.

### D. Resume Skill Extraction Metrics
- **Precision:** Correctly extracted skills divided by total extracted skills.
- **Recall:** Correctly extracted skills divided by ground-truth skills.
- **F1 Score:** Harmonic mean of precision and recall.

### E. System Latencies
- **P50 Latency:** Median API response time.
- **P95 Latency:** 95th percentile worst-case latency.
- **Vector Search Duration:** ChromaDB query time in milliseconds.

---

## 3. Running the Offline Benchmark Suite

```bash
cd AI-Interview-Intelligence/evaluation
python report.py
```
Outputs `evaluation_report.json` and prints summary tables.
