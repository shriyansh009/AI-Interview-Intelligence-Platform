import io
import unittest
from fastapi.testclient import TestClient
from main import app


class TestInterviews(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        email = "interview_flow_unit@example.com"
        pwd = "password123"
        self.client.post("/api/v1/auth/signup", json={"email": email, "password": pwd, "full_name": "Interview Candidate"})
        self.token = self.client.post("/api/v1/auth/login", json={"email": email, "password": pwd}).json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_interview_flow(self):
        # 2. Resume & Analysis
        resume_text = "Proficient in Python, FastAPI, Docker, and PostgreSQL databases.".encode("utf-8")
        r_id = self.client.post(
            "/api/v1/resumes/upload",
            headers=self.headers,
            files={"file": ("resume.txt", io.BytesIO(resume_text), "text/plain")}
        ).json()["id"]

        a_id = self.client.post(
            "/api/v1/analysis/run",
            headers=self.headers,
            json={"resume_id": r_id, "job_description_text": "Requires Python, FastAPI, and Kubernetes."}
        ).json()["id"]

        # 3. Generate Questions
        gen_resp = self.client.post(f"/api/v1/interviews/generate/{a_id}", headers=self.headers)
        self.assertEqual(gen_resp.status_code, 200)
        questions = gen_resp.json()
        self.assertGreater(len(questions), 0)
        q1 = questions[0]

        # 4. Create Session
        session_resp = self.client.post(
            "/api/v1/interviews/sessions",
            headers=self.headers,
            json={"analysis_id": a_id, "title": "Technical Assessment 1"}
        )
        self.assertEqual(session_resp.status_code, 201)
        s_id = session_resp.json()["id"]

        # 5. Submit Answer & Evaluation
        ans_resp = self.client.post(
            f"/api/v1/interviews/sessions/{s_id}/answer",
            headers=self.headers,
            json={
                "question_id": q1["id"],
                "answer_text": "I design FastAPI microservices with connection pooling in PostgreSQL and containerize them using Docker."
            }
        )
        self.assertEqual(ans_resp.status_code, 200)
        eval_data = ans_resp.json()
        self.assertGreater(eval_data["overall_score"], 0.0)
        self.assertIn("technical_accuracy", eval_data)

        # 6. Complete Session
        complete_resp = self.client.post(f"/api/v1/interviews/sessions/{s_id}/complete", headers=self.headers)
        self.assertEqual(complete_resp.status_code, 200)
        self.assertEqual(complete_resp.json()["status"], "completed")


if __name__ == "__main__":
    unittest.main()
