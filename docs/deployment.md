# Deploy to Render

This project runs on Render as three services: a FastAPI Docker web service, a React/Nginx Docker web service, and a managed PostgreSQL database. The backend also needs a persistent disk for uploaded files and its Chroma vector index.

## Before you start

- Push the project to a GitHub repository connected to your Render account.
- Have a Gemini or Mistral API key available.
- Choose a single Render region for the backend and database. The frontend should use the backend's private URL, so keep the web services in the same Render region and workspace.
- Use a paid backend web-service plan: Render persistent disks are not available on free web services. Choose enough RAM/CPU for PyTorch, embeddings, and Whisper; video transcription can need substantially more than a small instance.

## 1. Create the Render PostgreSQL database

In the Render Dashboard, choose **New → PostgreSQL**:

1. Name the database and select PostgreSQL 16.
2. Select a region. Use the same region for the backend service.
3. Choose a plan and create the database.
4. Open its **Connect** page and copy the **Internal Database URL**. Use this URL for the backend, not the external URL.

The app creates its relational tables at startup. It uses Chroma on the backend disk for vector data; it does not require the database's `pgvector` extension.

## 2. Create the backend web service

Choose **New → Web Service**, connect the repository, and configure:

| Setting | Value |
|---|---|
| Runtime | Docker |
| Branch | `main` |
| Dockerfile Path | `docker/Dockerfile.backend` |
| Docker Build Context Directory | `backend` |
| Health Check Path | `/health/live` |
| Region | Same as PostgreSQL |
| Plan | Paid plan with sufficient memory; start with at least 2 GB RAM and increase for transcription workloads |

Add these environment variables in the backend service's **Environment** settings:

| Key | Value |
|---|---|
| `ENV` | `production` |
| `DEBUG` | `false` |
| `DATABASE_URL` | Internal Database URL copied from Render PostgreSQL |
| `SECRET_KEY` | A unique random secret of at least 32 characters |
| `LLM_PROVIDER` | `gemini` or `mistral` |
| `GEMINI_API_KEY` | Your Gemini key when using Gemini |
| `MISTRAL_API_KEY` | Your Mistral key when using Mistral |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `VECTOR_DB_DIR` | `/var/data/vector_db` |
| `GUNICORN_WORKERS` | `1` to start; increase only after checking memory usage |

Generate a secret locally, for example with `openssl rand -hex 32`. Add optional `SARVAM_API_KEY` only if using Sarvam features. Do not put secrets in source control.

### Attach persistent backend storage

In the backend service's **Disks** settings, add a persistent disk:

- **Mount path:** `/var/data`
- **Size:** choose based on expected resume/video uploads and Chroma growth; increase it as needed.

The paths in `UPLOAD_DIR` and `VECTOR_DB_DIR` must remain under this mount. Without it, uploaded data and the vector index can be lost when Render replaces the instance. Persistent disks also mean this service runs as a single instance and redeploys can briefly interrupt requests; horizontal scaling requires moving uploads and vector storage to shared external services.

Deploy the backend and wait for it to pass `/health/live`. In its **Connect → Internal** section, copy its private service address. Use the full HTTP URL and port shown by Render (typically `http://<private-hostname>:10000`) in the next step.

## 3. Create the frontend web service

Create another **Web Service** using the same repository and branch:

| Setting | Value |
|---|---|
| Runtime | Docker |
| Dockerfile Path | `docker/Dockerfile.frontend` |
| Docker Build Context Directory | Repository root (`.`) |
| Health Check Path | `/healthz` |
| Region | Same as backend |
| Plan | Select a plan appropriate for expected traffic |

Set this environment variable:

| Key | Value |
|---|---|
| `BACKEND_URL` | Backend's private HTTP URL from its **Connect → Internal** section, without a trailing slash |

For example, use `http://<backend-private-hostname>:10000`, not the backend's public URL. Nginx proxies `/api/` requests to this service over Render's private network. The Docker image reads Render's `PORT` at startup, so the web server listens on the port Render assigns.

Deploy the frontend. Open its `onrender.com` URL and test account signup, login, and an AI-backed feature. The backend's `/health/ready` endpoint checks database and persistent storage readiness; it is available from the backend's private or public service URL.

## 4. Configure custom domains (optional)

Add your domain in the frontend service's **Settings → Custom Domains** and follow Render's DNS instructions. Render provisions TLS for verified domains. The browser uses the frontend domain; API traffic is reverse-proxied by Nginx, so no browser CORS configuration is needed.

## 5. CI/CD from GitHub Actions

The workflow in `.github/workflows/ci.yml` runs backend tests and the frontend type-check/build for pushes and pull requests. After both checks pass, a push to `main` triggers Render deploy hooks for the backend and frontend.

To make deployment happen **only after CI passes**:

1. In both Render web services, disable automatic deploys from Git so a push cannot deploy before GitHub Actions finishes.
2. In each service's **Settings**, create/copy its **Deploy Hook** URL. Treat each URL like a password.
3. In GitHub, go to **Settings → Secrets and variables → Actions**. Add the repository variable `DEPLOY_ENABLED` with value `true`.
4. Add repository secrets `RENDER_BACKEND_DEPLOY_HOOK` and `RENDER_FRONTEND_DEPLOY_HOOK`, using the corresponding URLs from Render.
5. Protect `main` and require both CI jobs to pass before merging.

With `DEPLOY_ENABLED` unset or set to `false`, CI still runs but does not deploy. The workflow never deploys pull requests or other branches. Render deploy hooks start a deployment; check each service's Render Events page to confirm the build and health check complete successfully.

## Operations and troubleshooting

- **Backend health check fails:** inspect Render logs; verify `DATABASE_URL`, the `/var/data` disk mount, and `UPLOAD_DIR`/`VECTOR_DB_DIR`.
- **Frontend loads but API calls fail:** check that `BACKEND_URL` is the backend's internal URL including `http://` and its port, with no trailing slash; confirm both services are in the same region and workspace.
- **Changes or uploads disappear:** verify a persistent disk is mounted at `/var/data` and both data directories are beneath it.
- **AI calls fail:** check the selected `LLM_PROVIDER` and the matching API key in the backend's Environment settings.
- **Video transcription is slow or runs out of memory:** increase backend CPU/RAM and storage, or lower the Whisper model with `WHISPER_MODEL`.
- **Database updates:** the app's `create_all` initializes missing tables but does not migrate existing ones. Back up the database and plan schema migrations before shipping schema changes.

## Alternative: self-host with Docker Compose

For deployments outside Render, the repository also includes `docker-compose.prod.yml`. Configure a root `.env` file and follow the Compose procedure there; its database and uploaded/vector data are stored in named Docker volumes.

## Render references

- [Render Docker services](https://render.com/docs/docker)
- [Render persistent disks](https://render.com/docs/disks)
- [Render PostgreSQL connections](https://render.com/docs/postgresql-creating-connecting)
- [Render private networking](https://render.com/docs/private-network)
- [Render deploy hooks](https://render.com/docs/deploy-hooks)
