# Production Deployment

This guide deploys the React frontend, FastAPI backend, PostgreSQL/pgvector database, and persistent upload/vector storage on a Linux server using Docker Compose. The production Compose file is `docker-compose.prod.yml`.

## Requirements

- A Linux server with Docker Engine and the Docker Compose v2 plugin (`docker compose`).
- Enough memory and disk for PostgreSQL, the embedding model, and video transcription. Whisper transcription is CPU- and memory-intensive; monitor usage and size the server accordingly.
- An API key for the configured LLM provider (Gemini or Mistral).
- A domain name and TLS reverse proxy for a public HTTPS deployment. The app's Nginx container serves HTTP on port 80; it does not terminate TLS.

## 1. Get the code onto the server

Clone the repository and enter its root directory:

```bash
git clone <repository-url>
cd AI-Interview-Intelligence-Platform
```

Install Docker Engine and the Compose v2 plugin if they are not already installed. Check that Compose is available:

```bash
docker compose version
```

## 2. Configure production secrets

Create the root `.env` file:

```bash
cp .env.example .env
```

Edit `.env`. At minimum, set a unique PostgreSQL password, a strong JWT secret, and the API key for the selected provider:

```dotenv
POSTGRES_USER=interview_app
POSTGRES_PASSWORD=<long-random-alphanumeric-password>
POSTGRES_DB=ai_interview_intelligence

SECRET_KEY=<at-least-32-random-characters>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<your-gemini-api-key>
```

Alternatively, set `LLM_PROVIDER=mistral` and provide `MISTRAL_API_KEY`. A `SECRET_KEY` can be generated with `openssl rand -hex 32`. Use a PostgreSQL password made of URL-safe characters because Compose inserts it into the backend's database connection URL.

Do not use the example secret or Compose's default database credentials in production. Keep `.env` private and out of version control. The `DATABASE_URL` in `.env.example` is for local development; the production Compose file builds the backend URL from the `POSTGRES_*` values.

## 3. Start the production stack

From the repository root:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The Compose file builds the frontend and backend images, waits for PostgreSQL's health check before starting the backend, and then waits for the backend before starting the frontend. The PostgreSQL, uploads, and Chroma vector database data are kept in named Docker volumes.

Check container status and logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f postgres backend frontend
```

Once running, the frontend is available on the server at `http://127.0.0.1:8080/`. The production Nginx frontend proxies `/api/` requests to the backend. The frontend, backend, and PostgreSQL host ports are bound to `127.0.0.1`, so they are not exposed directly to the public internet.

## 4. Add HTTPS and deploy the domain

Point the domain's DNS record to the server. Configure a host-level TLS reverse proxy (for example, Caddy or Nginx) to obtain/renew a certificate and forward HTTPS traffic to `127.0.0.1:8080`. Allow inbound HTTPS (443) and, if needed for certificate issuance, HTTP (80) at the host/cloud firewall. The app itself should only be reachable through the TLS proxy for a public deployment.

The API's interactive Swagger docs are disabled when `ENV=production`; the frontend uses the same-origin `/api/` proxy.

## 5. Verify health

Check the frontend health endpoint:

```bash
curl -fsS http://127.0.0.1:8080/healthz
```

Check backend readiness from inside its container:

```bash
docker compose -f docker-compose.prod.yml exec backend \
  python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health/ready').read().decode())"
```

Readiness should report the database, vector storage, and upload storage as ready. You can also open the site in a browser and test sign-up, login, and an LLM-backed feature.

## CI/CD with GitHub Actions

The workflow in `.github/workflows/ci.yml` runs the backend tests and frontend type-check/build on pushes and pull requests. After both checks pass, a push to `main` deploys over SSH if the repository variable `DEPLOY_ENABLED` is set to `true`. Pull requests and pushes to other branches never deploy.

### Prepare the server

Complete the production setup above, then clone the repository on the server into a stable absolute path, such as `/opt/ai-interview-intelligence`. Check out the `main` branch, create the root `.env` there with production settings, and verify that the `deploy` user can run Docker Compose and pull from the GitHub repository. For a private repository, configure a separate read-only GitHub deploy key on the server for `git pull`.

Create a dedicated SSH key pair for GitHub Actions. Add its public key to the server's deploy user's `~/.ssh/authorized_keys`; store its private key as a GitHub Actions secret. Avoid using a personal SSH key or the root account.

### Configure GitHub Actions

In the repository's **Settings → Secrets and variables → Actions**, add these repository variables:

| Variable | Value |
|---|---|
| `DEPLOY_ENABLED` | `true` to enable deployment; leave unset or set to `false` to disable it |
| `DEPLOY_HOST` | Server hostname or IP address |
| `DEPLOY_USER` | SSH deploy account |
| `DEPLOY_PATH` | Absolute path to the server clone, without spaces or single quotes |
| `DEPLOY_PORT` | SSH port; optional, defaults to `22` |

Add these repository secrets:

| Secret | Value |
|---|---|
| `DEPLOY_SSH_PRIVATE_KEY` | Private half of the dedicated Actions SSH key |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line(s) for the server |

Obtain the server host key with `ssh-keyscan -p <port> <host>`, verify its fingerprint against the server provider or another trusted channel, and only then save the verified output as `DEPLOY_KNOWN_HOSTS`. The workflow requires strict SSH host-key checking.

### Deployment behavior

For each successful push to `main`, Actions connects to the server, fast-forward pulls `origin main`, and runs `docker compose -f docker-compose.prod.yml up -d --build`. It then prints the Compose service status. The server's `.env` and persistent Docker volumes remain in place. If either CI job fails, deployment is skipped.

Protect the `main` branch with required CI checks and restrict who can change the deployment variables/secrets. To disable automatic deployments while keeping CI enabled, unset `DEPLOY_ENABLED` or change it to `false`.

## 7. Manual update and rollback

Pull the desired revision and rebuild/recreate the services:

```bash
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Review the application/database schema changes before upgrading. PostgreSQL's `database/schema.sql` bootstrap script runs only when the database volume is first created, and the backend's `create_all` initialization creates missing tables but does not migrate existing tables.

To roll back application code, check out the desired previously deployed commit on the server and rebuild with the same Compose command. Take and verify database backups before deploying schema changes; rolling application code back does not reverse database changes.

## Data, backups, and shutdown

The production volumes are `postgres_prod_data`, `backend_prod_uploads`, and `backend_prod_vectors` (with the Compose project name prefixed). Back up the database and application files/volumes regularly and store backups outside the server. For example, a SQL dump can be written on the host with:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > database-backup.sql
```

Stopping services does not delete their volumes:

```bash
docker compose -f docker-compose.prod.yml down
```

Do not use `docker compose down -v` for routine shutdown or upgrades: it deletes the named volumes, including database, uploaded files, and vector data.

## Troubleshooting

- **A container exits on startup:** inspect `docker compose -f docker-compose.prod.yml logs <service>`. Confirm that `.env` is in the repository root and contains non-placeholder secrets.
- **Backend is unhealthy or not ready:** verify PostgreSQL is healthy, credentials match, and the backend can write to its upload and vector directories.
- **LLM calls fail:** check `LLM_PROVIDER` and the matching provider API key in `.env`; then recreate the backend with `docker compose -f docker-compose.prod.yml up -d --force-recreate backend`.
- **Upload/transcription fails:** check free disk space and backend logs. Video processing requires FFmpeg (included in the backend image) and can use substantial CPU, RAM, and disk.
- **Need a clean database:** only do this when you intend to permanently delete all application data. Removing the Compose volumes destroys the database, uploaded files, and vector index.

## Local production-stack smoke test

Before deploying to a server, the same stack can be tested locally:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Open `http://localhost:8080/`, and follow the health checks above. Stop it with `docker compose -f docker-compose.prod.yml down` when finished.
