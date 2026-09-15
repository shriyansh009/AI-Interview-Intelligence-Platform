# Multi-Source RAG Pipeline

## Overview

The platform implements a unified Multi-Source Retrieval-Augmented Generation (RAG) engine that synthesizes context across four distinct domains:

1. **Candidate Resume** (stored in ChromaDB collection `resume_{user_id}`)
2. **Target Job Description** (stored in ChromaDB collection `jd_{user_id}`)
3. **Video Transcripts with Timestamps** (stored in ChromaDB collections `video_{video_id}`)
4. **Conversation History** (retrieved from relational session messages)

```text
User Question
     │
     v
Query Embedding (SentenceTransformer all-MiniLM-L6-v2)
     │
     ├─────────────────┬───────────────────┐
     v                 v                   v
Resume Search      JD Search          Video Search
(resume_{uid})     (jd_{uid})         (video_{vid})
     │                 │                   │
     └─────────────────┼───────────────────┘
                       v
            Rank & Deduplicate Top-K
                       v
         Build Context with Metadata & Timestamps
                       v
            LLM Generation (Gemini / Mistral)
                       v
          Grounded Answer + Clickable Citations
```

---

## Citation Format

Every retrieved piece of context includes traceable source metadata:

```json
{
  "source_type": "video",
  "source_id": 14,
  "title": "System Design & Distributed Caching",
  "start_time": 142.5,
  "end_time": 178.0,
  "timestamp_formatted": "02:22",
  "text_snippet": "In this section we discuss Redis cluster failover mechanisms...",
  "similarity": 0.892
}
```

The frontend renders these as interactive chips, allowing the user to click and seek the video to the exact second where the concept is taught.
