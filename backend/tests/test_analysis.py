import io
import json
import unittest
from fastapi.testclient import TestClient
from main import app


class TestAnalysis(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        email = "analysis_user_unit@example.com"
        pwd = "password123"
        self.client.post(
            "/api/v1/auth/signup",
            json={"email": email, "password": pwd, "full_name": "Analysis Tester"}
        )
        login_resp = self.client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_analysis_run(self):
        sample_resume = (
            "Experienced Engineer with deep skills in Python, FastAPI, PostgreSQL, and Machine Learning."
        ).encode("utf-8")
        upload_resp = self.client.post(
            "/api/v1/resumes/upload",
            headers=self.headers,
            files={"file": ("analysis_resume.txt", io.BytesIO(sample_resume), "text/plain")}
        )
        resume_id = upload_resp.json()["id"]

        # Run Analysis with Job Description text
        jd_text = "Looking for a Python and FastAPI Backend Engineer with Docker and Kubernetes skills."
        analysis_resp = self.client.post(
            "/api/v1/analysis/run",
            headers=self.headers,
            json={
                "resume_id": resume_id,
                "job_description_text": jd_text
            }
        )
        self.assertEqual(analysis_resp.status_code, 201)
        analysis_data = analysis_resp.json()
        self.assertGreater(analysis_data["ats_score"], 0.0)
        self.assertIn("id", analysis_data)

        matching = json.loads(analysis_data["matching_skills"])
        self.assertTrue(any("Python" in s or "Fastapi" in s for s in matching))


if __name__ == "__main__":
    unittest.main()
