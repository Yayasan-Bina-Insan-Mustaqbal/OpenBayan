# FastAPI Production Deployment: Server Workers

When deploying FastAPI, the term "Worker" means something completely different than it does in Prefect. You now have two distinct types of workers in your architecture that do not overlap.

## 1. The Two Types of Workers

| Type | Engine | Purpose | Duration |
| :--- | :--- | :--- | :--- |
| **1. Server Workers** | Uvicorn / Gunicorn | Handles incoming web traffic (HTTP/WebSockets) from React. | Milliseconds (Instant) |
| **2. Background Workers** | Prefect | Runs heavy ML models (SpaCy, Vectors) in the background. | Minutes / Hours |

## 2. Why FastAPI Needs "Server Workers"

Python has a limitation called the GIL (Global Interpreter Lock), meaning a single Python process can only execute one line of code at a time.

*   If you run FastAPI normally (`uvicorn api.main:app`), it runs as a single process.
*   If 10 users click "Search" at the exact same millisecond, that single process has to juggle them asynchronously.
*   If one of those requests accidentally blocks the CPU, the other 9 users will experience a frozen website.

**The Solution**: You run multiple **Server Workers**. This spins up multiple, identical copies of your FastAPI application (processes) running in parallel, all listening to Port 8080. If Worker 1 is busy, the OS routes the next user to Worker 2.

## 3. How to Configure FastAPI Workers in Docker

To implement this perfectly in your `docker-compose.yml`, you don't actually need Gunicorn anymore (as previously recommended in older Python tutorials). The creator of FastAPI (Tiangolo) now recommends running Uvicorn directly with the `--workers` flag.

Here is how your FastAPI service should look in your Docker Compose setup:

```yaml
  # ---------------------------------------------------------
  # API GATEWAY (FastAPI)
  # Handles React HTTP requests, Auth Scopes, and routes to SurrealDB.
  # ---------------------------------------------------------
  api-server:
    build: 
      context: ./api
    container_name: bayan_api
    restart: unless-stopped
    ports:
      - "8080:8080"
    # THE MAGIC: Spawn 4 independent Uvicorn worker processes
    command: uvicorn main:app --host 0.0.0.0 --port 8080 --workers 4
    environment:
      - SURREAL_WS_URL=ws://surrealdb:8000/rpc
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - surrealdb
    networks:
      - bayan_network
```

### The "Rule of Thumb" for Worker Count

How many `--workers` should you set? The standard server engineering formula is:

**Workers = (Number of CPU Cores x 2) + 1**

If your VPS server has 2 CPU cores, you should set `--workers 5`. This ensures that even if 4 web requests are waiting for SurrealDB to respond, the 5th worker is completely free to serve the next user instantly.

## 4. The Complete Flow (User to Database)

With Server Workers enabled, here is how a massive spike in traffic is handled gracefully:

1.  **The Spike**: 100 users hit your React frontend and trigger a search simultaneously.
2.  **The Load Balancer (Internal)**: Uvicorn's master process receives the 100 requests on Port 8080.
3.  **The Distribution**: It instantly divides the 100 requests among your 4 active FastAPI Server Workers.
4.  **The Security Check**: Each worker independently (and in parallel) verifies the NextAuth JWT tokens using FastAPI `SecurityScopes`.
5.  **The Query**: The workers open parallel WebSocket connections to SurrealDB, executing the Hybrid Vector Search.
6.  **The Response**: The results stream back to the 100 users with zero CPU blocking!
