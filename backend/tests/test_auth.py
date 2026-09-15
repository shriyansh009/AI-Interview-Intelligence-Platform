import unittest
from fastapi.testclient import TestClient
from main import app


class TestAuth(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_auth_signup_and_login(self):
        test_email = "testuser_auth_unit@example.com"
        test_password = "securePassword123"

        # Signup
        signup_resp = self.client.post(
            "/api/v1/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "full_name": "Test User",
                "username": "testuser_auth_unit"
            }
        )
        self.assertIn(signup_resp.status_code, [201, 400])
        if signup_resp.status_code == 201:
            data = signup_resp.json()
            self.assertIn("access_token", data)
            self.assertEqual(data["user"]["email"], test_email)

        # Login
        login_resp = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": test_password
            }
        )
        self.assertEqual(login_resp.status_code, 200)
        login_data = login_resp.json()
        self.assertIn("access_token", login_data)
        token = login_data["access_token"]

        # Get Me
        me_resp = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["email"], test_email)


if __name__ == "__main__":
    unittest.main()
