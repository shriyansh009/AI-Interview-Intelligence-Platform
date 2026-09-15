import io
import unittest
from fastapi.testclient import TestClient
from main import app


class TestResumes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        email = "resume_tester_unit@example.com"
        pwd = "password123"
        self.client.post(
            "/api/v1/auth/signup",
            json={"email": email, "password": pwd, "full_name": "Resume Tester"}
        )
        resp = self.client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        self.token = resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_resume_upload_and_listing(self):
        sample_resume_content = (
            "Senior Software Engineer with 5+ years of experience in Python, FastAPI, Docker, and PostgreSQL. "
            "Built scalable microservices and integrated ChromaDB vector search."
        ).encode("utf-8")

        file_payload = ("test_resume.txt", io.BytesIO(sample_resume_content), "text/plain")

        # Upload
        upload_resp = self.client.post(
            "/api/v1/resumes/upload",
            headers=self.headers,
            files={"file": file_payload}
        )
        self.assertEqual(upload_resp.status_code, 201)
        resume_data = upload_resp.json()
        self.assertIn("id", resume_data)
        resume_id = resume_data["id"]

        # List
        list_resp = self.client.get("/api/v1/resumes", headers=self.headers)
        self.assertEqual(list_resp.status_code, 200)
        self.assertTrue(any(r["id"] == resume_id for r in list_resp.json()))

        # Get Single
        get_resp = self.client.get(f"/api/v1/resumes/{resume_id}", headers=self.headers)
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.json()["filename"], "test_resume.txt")


if __name__ == "__main__":
    unittest.main()
