import io
import unittest
from fastapi.testclient import TestClient
from main import app


class TestEndToEnd(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_complete_end_to_end_journey(self):
        """
        End-to-End Integration Flow per PRD:
        Register -> Upload Resume -> Add JD -> ATS Analysis -> Ask RAG Question -> Start Interview -> Evaluate Answer -> View Evaluation Metrics
        """
        # 1. Register & Login
        email = "e2e_unit_candidate@example.com"
        pwd = "masterPassword123"
        signup_res = self.client.post("/api/v1/auth/signup", json={"email": email, "password": pwd, "full_name": "E2E Candidate"})
        self.assertIn(signup_res.status_code, [201, 400])

        login_res = self.client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload Resume
        resume_bytes = (
            "AI Engineer specializing in Retrieval Augmented Generation, SentenceTransformers, FastAPI, and ChromaDB vector search."
        ).encode("utf-8")
        resume_res = self.client.post(
            "/api/v1/resumes/upload",
            headers=headers,
            files={"file": ("candidate_resume.txt", io.BytesIO(resume_bytes), "text/plain")}
        )
        self.assertEqual(resume_res.status_code, 201)
        resume_id = resume_res.json()["id"]

        # 3. Add Job Description
        jd_res = self.client.post(
            "/api/v1/jobs",
            headers=headers,
            json={
                "title": "Senior AI Systems Architect",
                "company": "NextGen AI Labs",
                "raw_text": "Requires experience in RAG, SentenceTransformers, Vector Databases, FastAPI, and Docker."
            }
        )
        self.assertEqual(jd_res.status_code, 201)
        jd_id = jd_res.json()["id"]

        # 4. Generate ATS Score & Skill Gap Analysis
        analysis_res = self.client.post(
            "/api/v1/analysis/run",
            headers=headers,
            json={"resume_id": resume_id, "job_description_id": jd_id}
        )
        self.assertEqual(analysis_res.status_code, 201)
        analysis_id = analysis_res.json()["id"]
        self.assertGreater(analysis_res.json()["ats_score"], 0.0)

        # 5. Ask Multi-Source RAG Question
        rag_res = self.client.post(
            "/api/v1/rag/query",
            headers=headers,
            json={
                "question": "What core competencies does the candidate have for this job?",
                "sources": ["resume", "job_description"],
                "analysis_id": analysis_id
            }
        )
        self.assertEqual(rag_res.status_code, 200)
        self.assertIn("answer", rag_res.json())
        self.assertGreater(len(rag_res.json()["sources"]), 0)

        # 6. Start Mock Interview
        session_res = self.client.post(
            "/api/v1/interviews/sessions",
            headers=headers,
            json={"analysis_id": analysis_id, "title": "Technical Screening"}
        )
        self.assertEqual(session_res.status_code, 201)
        session_id = session_res.json()["id"]

        # 7. Generate Questions
        questions_res = self.client.post(f"/api/v1/interviews/generate/{analysis_id}", headers=headers)
        self.assertEqual(questions_res.status_code, 200)
        q_list = questions_res.json()
        self.assertGreater(len(q_list), 0)
        test_q = q_list[0]

        # 8. Submit Answer and Receive Rubric Evaluation
        ans_res = self.client.post(
            f"/api/v1/interviews/sessions/{session_id}/answer",
            headers=headers,
            json={
                "question_id": test_q["id"],
                "answer_text": "We store chunked text in ChromaDB and use cosine similarity on SentenceTransformer embeddings to retrieve top-k passages."
            }
        )
        self.assertEqual(ans_res.status_code, 200)
        self.assertGreater(ans_res.json()["overall_score"], 0.0)

        # 9. View System Evaluation Summary
        eval_res = self.client.get("/api/v1/evaluation/metrics", headers=headers)
        self.assertEqual(eval_res.status_code, 200)
        self.assertGreaterEqual(len(eval_res.json()["categories"]), 4)


if __name__ == "__main__":
    unittest.main()
