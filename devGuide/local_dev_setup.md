# Local Development Setup: Docker-Based Full Stack

This guide explains how to run the complete OpenBayan stack locally using Docker. By the end, you will have SurrealDB, the Prefect orchestrator, the Python AI worker, and the React frontend all running simultaneously and communicating with each other.

## 1. Prerequisites

Ensure the following are installed on your machine:

| Tool | Purpose | Check |
|:---|:---|:---|
| **Docker Desktop / Docker Engine** | Container runtime | `docker --version` |
| **Docker Compose** | Multi-service orchestration | `docker compose version` |
| **Node.js 20+** | Frontend development server | `node --version` |
| **Git** | Source control | `git --version` |

---

## 2. Monorepo Structure Recap

```
OpenBayan/                        ← Clone root
├── OpenBayanBackend/             ← All backend services (Docker Compose)
│   ├── docker-compose.yml
│   ├── .env                      ← Backend secrets (copy from .env.example)
│   └── worker/
│       └── Dockerfile
├── OpenBayanFrontend/            ← React + Vite frontend
│   ├── docker-compose.yml        ← Optional: Run frontend in Docker too
│   ├── package.json
│   └── src/
└── devGuide/                     ← You are here
```

---

## 3. Step 1: Configure Environment Variables

### Backend `.env`

Create `OpenBayanBackend/.env` (never commit this file to Git):

```bash
# OpenBayanBackend/.env

# SurrealDB Root Credentials
SURREAL_USER=root
SURREAL_PASS=your_strong_password_here

# Shared secret between NextAuth (frontend) and any future FastAPI gateway
NEXTAUTH_SECRET=your_32_character_random_secret_here

# Prefect configuration (optional, for remote orchestration)
# PREFECT_API_KEY=your_prefect_cloud_api_key_if_using_cloud
```

Generate a strong secret:
```bash
openssl rand -base64 32
```

### Frontend `.env.local`

Create `OpenBayanFrontend/.env.local`:

```bash
# OpenBayanFrontend/.env.local

# Points to SurrealDB (running in Docker on your machine)
VITE_SURREAL_WS_URL=ws://localhost:8000/rpc
VITE_SURREAL_NS=bayan
VITE_SURREAL_DB=knowledge_graph

# NextAuth (when you add it)
# NEXTAUTH_URL=http://localhost:5173
# NEXTAUTH_SECRET=same_secret_as_backend
```

---

## 4. Step 2: Start the Backend Services

```bash
cd OpenBayanBackend

# Build the custom Python worker image (first time only, ~5 min for SpaCy model download)
docker compose build

# Start all backend services in detached mode
docker compose up -d
```

Verify all services are running:

```bash
docker compose ps
```

Expected output:

```
NAME              IMAGE                                    STATUS          PORTS
bayan_surrealdb   surrealdb/surrealdb:latest               Up              0.0.0.0:8000->8000/tcp
bayan_prefect     prefecthq/prefect:3.6.27-python3.12-...  Up              0.0.0.0:4200->4200/tcp
bayan_worker      openbayan-backend-data-worker            Up
bayan_jupyter     openbayan-backend-jupyter                Up              0.0.0.0:8888->8888/tcp
```

### Verify SurrealDB is ready

```bash
# Should return {"code":200,"details":"Information","information":...}
curl http://localhost:8000/health
```

---

## 5. Step 3: Initialize the Database Schema

Run the schema setup script once to create all tables, indexes, and graph relation definitions in SurrealDB:

```bash
# Connect into the SurrealDB container and execute the schema
docker exec -it bayan_surrealdb surreal sql \
  --conn ws://localhost:8000/rpc \
  --user root --pass root \
  --ns bayan --db knowledge_graph \
  --hide-welcome
```

Then paste and run the schema definitions from `devGuide/database_surrealdb_schema.md`.

> [!TIP]
> Consider saving all schema SurrealQL in a file `OpenBayanBackend/schema.surql` and mounting it into the SurrealDB container for automatic initialization.

---

## 6. Step 4: Start the Frontend (Option A — Native Node)

The recommended approach for fastest hot-reloading during frontend development:

```bash
cd OpenBayanFrontend

# Install dependencies (first time only)
npm install

# Start the Vite dev server
npm run dev
```

The React app will be available at: **http://localhost:5173**

Vite's HMR (Hot Module Replacement) will automatically reload changed components without losing application state.

---

## 7. Step 4: Start the Frontend (Option B — Docker)

Use this if you want a fully containerized environment:

```bash
cd OpenBayanFrontend

# Starts the Vite dev server in Docker with live volume mounting
docker compose up ide-dev
```

Available at: **http://localhost:5173**

> [!NOTE]
> Option B is slightly slower for hot-reload because file change events must cross the Docker volume bridge. For daily development, Option A (native Node) is preferred. Use Docker for production (`ide-web` service) or CI validation.

---

## 8. Service Dashboard & URLs

Once everything is running, access these URLs:

| Service | URL | Purpose |
|:---|:---|:---|
| **React Frontend** | http://localhost:5173 | The main application UI |
| **SurrealDB** | http://localhost:8000 | Database API (WebSocket) |
| **Prefect UI** | http://localhost:4200 | AI pipeline monitoring dashboard |
| **Jupyter Lab** | http://localhost:8888 | Notebook workspace for AI research and pipeline tests |

If you use a separate Ollama machine for embeddings or inference, set `OLLAMA_URL` in `OpenBayanBackend/.env` before starting the backend:

```dotenv
OLLAMA_URL=http://<ollama-pc-ip>:11434
OLLAMA_EMBED_MODEL=mxbai-embed-large:latest
```

---

## 9. Common Commands Reference

```bash
# === BACKEND ===

# Start all backend services
docker compose -f OpenBayanBackend/docker-compose.yml up -d

# Stop all services (data is preserved in named volumes)
docker compose -f OpenBayanBackend/docker-compose.yml down

# Stop and DESTROY all data (full reset)
docker compose -f OpenBayanBackend/docker-compose.yml down -v

# Rebuild the worker image (after changing Dockerfile or requirements)
docker compose -f OpenBayanBackend/docker-compose.yml build data-worker

# Rebuild and start Jupyter Lab
docker compose -f OpenBayanBackend/docker-compose.yml up -d --build jupyter

# Follow live logs from the Python worker
docker logs bayan_worker -f

# Follow live logs from Jupyter Lab
docker logs bayan_jupyter -f

# Follow live logs from SurrealDB
docker logs bayan_surrealdb -f

# Manually trigger a Prefect flow via CLI
docker exec -it bayan_worker prefect deployment run "OpenBayan Text Ingestion/default"


# === FRONTEND ===

# Start (native)
cd OpenBayanFrontend && npm run dev

# Lint
cd OpenBayanFrontend && npm run lint

# Build production bundle
cd OpenBayanFrontend && npm run build

# Preview production build locally
cd OpenBayanFrontend && npm run preview
```

---

## 10. Troubleshooting

### `bayan_worker` exits immediately on startup

The worker polls Prefect Server, which may not be fully initialized yet. The work pool must exist before the worker starts.

```bash
# Wait for Prefect to be fully up, then create the work pool
sleep 10
docker exec bayan_prefect prefect work-pool create "bayan-ingestion-pool" --type process

# Then restart the worker
docker compose restart data-worker
```

### SurrealDB connection refused on port 8000

Check if the container is running and the port binding is correct:

```bash
docker ps | grep surrealdb
# Confirm: 0.0.0.0:8000->8000/tcp
```

If using Linux with UFW firewall, allow the port:
```bash
sudo ufw allow 8000
```

### Frontend can't reach SurrealDB (CORS error)

SurrealDB by default allows all origins in development. If you see CORS errors, verify your `VITE_SURREAL_WS_URL` in `.env.local` points to `ws://localhost:8000/rpc` (not `http://`).

> [!WARNING]
> Never expose `SURREAL_PASS` (root password) in the frontend `.env` files prefixed with `VITE_`. Any variable prefixed with `VITE_` is embedded in the browser bundle and is publicly visible. Use row-level permissions with scoped tokens for frontend database access.
