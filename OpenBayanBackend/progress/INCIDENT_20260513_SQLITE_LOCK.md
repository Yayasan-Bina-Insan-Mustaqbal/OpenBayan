# Incident Report: SQLITE_BUSY (Database Locked)

**Date**: May 13, 2026
**Duration**: ~9.5 Hours (May 12, 23:30 - May 13, 09:00)
**Impact**: Enrichment stalled at 624/95,716 records. Devserver services unresponsive.

---

## 1. Symptom
*   Prefect worker and server logs showing `sqlite3.OperationalError: database is locked`.
*   All `openbayan` containers for frontend and backend were in a stopped/inactive state.
*   Murad enrichment progress remained static at 624 records.

## 2. Root Cause Analysis (RCA)
*   **Concurrency Overload**: The Prefect server uses a default SQLite database. Under high concurrency (10+ parallel LLM enrichment tasks), the overhead of task state updates caused excessive write-locks.
*   **Recursive Failure**: Once SQLite locks, workers fail to report task completion, leading to internal timeouts and eventual service crash/shutdown in the container environment.

## 3. Resolution
*   **Manual Restart**: Performed `docker compose up -d` for both frontend and backend stacks at 09:04 AM.
*   **State Verification**: Verified SurrealDB reachability and current record counts (95,716 ingested, 624 enriched).

## 4. Why is Murad Ingestion Stalled?
*   **Current Count**: 95,716 / 96,243 (99.4%).
*   **Cause**: Approximately 527 records are missing. Reviewing `ingest_murad.py`, any record failing to generate an embedding via Ollama (timeout or model error) is silently skipped (`continue`). The 99.4% state likely represents all successfully embedded records.

## 5. Prevention Strategy
*   **Short-term**: Reduce concurrency to 5 workers or increase `PREFECT_API_DATABASE_CONNECTION_TIMEOUT`.
*   **Long-term**: **MANDATORY** migration of Prefect internal database from SQLite to **PostgreSQL**. Prefect is designed to use Postgres for production-grade concurrency.
*   **Monitoring**: Implement a health-check script that restarts the stack automatically if `database is locked` appears in logs.

---
*Reported by Antigravity AI*
