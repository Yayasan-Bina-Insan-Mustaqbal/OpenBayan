# Pydantic AI for OpenBayan Knowledge Graph

This guide explains which Pydantic AI libraries fit OpenBayan's current stack and how to use them for Knowledge Graph extraction, validation, enrichment, and orchestration.

## 1. Recommendation

Use **`pydantic-ai`** as the main library.

It gives OpenBayan:

| Need | Library feature | OpenBayan use |
|:---|:---|:---|
| Extract structured entities from Arabic/Islamic text | `Agent(..., output_type=...)` with Pydantic models | Convert raw text into validated `Sahifah`, `Faidah`, `Alamah`, and relation candidates. |
| Call SurrealDB safely from agent workflows | `@agent.tool` with typed dependencies | Search existing nodes, deduplicate tags, create relation suggestions, and write approved graph records. |
| Split ingestion into deterministic steps | `pydantic_graph` | Model extraction pipelines as typed execution graphs instead of one large agent prompt. |
| Track LLM cost, latency, tool calls, and failures | Pydantic Logfire integration | Trace every extraction run, SurrealDB query tool, and model request. |
| Run long jobs reliably | Prefect integration / durable execution | Keep Prefect as the worker orchestrator while Pydantic AI handles agent logic inside tasks. |
| Test extraction without real LLM calls | `TestModel` / `FunctionModel` | Unit-test graph extraction schemas, tools, and flow behavior. |

OpenBayan should not use Pydantic AI as the graph database. SurrealDB stays the graph store. Pydantic AI should be the typed AI extraction and reasoning layer that prepares data for SurrealDB.

## 2. Best-Fit Package Set

Install these in the Docker worker image:

```txt
pydantic-ai
logfire[pydantic-ai,httpx]
```

Optional slim install if image size becomes a problem:

```txt
pydantic-ai-slim[openai,anthropic,google,ollama,logfire,prefect]
pydantic-graph
```

Use the full `pydantic-ai` package first for local research because it includes more providers and reduces setup friction. Move to `pydantic-ai-slim[...]` only after the production model provider is fixed. Add `pydantic-graph` explicitly when using `pydantic-ai-slim`, because graph support is not part of the slim base install.

## 3. Installation

OpenBayan development must run inside Docker. Do not install or run the worker directly on the host.

Add the packages to [OpenBayanBackend/worker/requirements.txt](../OpenBayanBackend/worker/requirements.txt):

```txt
pydantic-ai
logfire[pydantic-ai,httpx]
```

Then rebuild the worker and notebook images:

```bash
cd OpenBayanBackend
docker compose build data-worker jupyter
docker compose up -d surrealdb prefect-server data-worker jupyter
```

Verify imports inside the container:

```bash
docker compose exec jupyter python - <<'PY'
from pydantic_ai import Agent
from pydantic_graph import BaseNode, Graph
import logfire

print("pydantic-ai ok")
PY
```

If using Logfire cloud, configure a write token through environment variables rather than committing `.logfire` or secrets:

```yaml
environment:
  - LOGFIRE_TOKEN=${LOGFIRE_TOKEN:-}
  - LOGFIRE_SERVICE_NAME=openbayan-ai-worker
```

## 4. Stack Placement

Recommended architecture:

```text
Notebook experiment
  -> reusable extraction module
  -> Pydantic AI agent / pydantic_graph workflow
  -> Prefect task and flow
  -> SurrealDB records and RELATE edges
  -> Next.js reads graph through SurrealDB permissions
```

Pydantic AI belongs in `OpenBayanBackend/worker`, not in the browser and not in Next.js route handlers. Heavy AI work stays in the Python worker or Jupyter container.

## 5. Core Knowledge Graph Models

Start with strict output models. These models force the LLM to return graph-shaped data instead of prose.

```python
from typing import Literal

from pydantic import BaseModel, Field


class ExtractedAlamah(BaseModel):
    label: str = Field(min_length=1)
    category: str | None = None
    confidence: float = Field(ge=0, le=1)


class ExtractedFaidah(BaseModel):
    body: str = Field(min_length=1)
    source_ref: str | None = None
    tags: list[ExtractedAlamah] = Field(default_factory=list)


class RelationCandidate(BaseModel):
    source_body: str
    relation: Literal["extracted_from", "tagged_with", "contains", "supports", "contrasts"]
    target_label: str
    confidence: float = Field(ge=0, le=1)


class KnowledgeGraphExtraction(BaseModel):
    source_title: str
    language: Literal["ar", "en", "mixed"]
    fawaid: list[ExtractedFaidah]
    relations: list[RelationCandidate] = Field(default_factory=list)
```

Map model output to SurrealDB only after validation and deduplication.

## 6. Agent Pattern

Use one extraction agent per task family. Keep prompts narrow.

```python
from dataclasses import dataclass

from pydantic_ai import Agent, RunContext


@dataclass
class KGDeps:
    owner_id: str
    source_title: str
    db: object


kg_extraction_agent = Agent(
    "openai:gpt-5.2",
    deps_type=KGDeps,
    output_type=KnowledgeGraphExtraction,
    instructions=(
        "Extract OpenBayan knowledge graph candidates from Islamic research text. "
        "Return only validated structured data. Preserve Arabic wording when present. "
        "Do not invent sources, tags, or relations."
    ),
)


@kg_extraction_agent.tool
async def find_existing_tags(ctx: RunContext[KGDeps], labels: list[str]) -> list[dict]:
    """Find existing Alamah records so the agent can avoid duplicate tags."""
    result = await ctx.deps.db.query(
        "SELECT id, label, category FROM alamah WHERE label IN $labels;",
        {"labels": labels},
    )
    return result[0].get("result", [])
```

Usage inside worker code:

```python
deps = KGDeps(owner_id=owner_id, source_title=source_title, db=db)
result = await kg_extraction_agent.run(raw_text, deps=deps)
extraction = result.output
```

## 7. Graph Workflow Pattern

Use `pydantic_graph` when workflow control matters. This is an execution graph, not the SurrealDB knowledge graph.

Good first pipeline:

```text
CleanText
  -> SegmentText
  -> ExtractCandidates
  -> DeduplicateAgainstSurrealDB
  -> GenerateEmbeddings
  -> PersistGraph
  -> End
```

Skeleton:

```python
from __future__ import annotations

from dataclasses import dataclass, field

from pydantic_graph import BaseNode, End, Graph, GraphRunContext


@dataclass
class KGState:
    raw_text: str
    cleaned_text: str = ""
    extraction: KnowledgeGraphExtraction | None = None
    sahifah_id: str | None = None


@dataclass
class KGWorkflowDeps:
    owner_id: str
    source_title: str
    db: object


@dataclass
class CleanText(BaseNode[KGState, KGWorkflowDeps, str]):
    async def run(self, ctx: GraphRunContext[KGState, KGWorkflowDeps]) -> ExtractCandidates:
        ctx.state.cleaned_text = " ".join(ctx.state.raw_text.split())
        return ExtractCandidates()


@dataclass
class ExtractCandidates(BaseNode[KGState, KGWorkflowDeps, str]):
    async def run(self, ctx: GraphRunContext[KGState, KGWorkflowDeps]) -> PersistGraph:
        result = await kg_extraction_agent.run(
            ctx.state.cleaned_text,
            deps=KGDeps(
                owner_id=ctx.deps.owner_id,
                source_title=ctx.deps.source_title,
                db=ctx.deps.db,
            ),
        )
        ctx.state.extraction = result.output
        return PersistGraph()


@dataclass
class PersistGraph(BaseNode[KGState, KGWorkflowDeps, str]):
    async def run(self, ctx: GraphRunContext[KGState, KGWorkflowDeps]) -> End[str]:
        # Persist with parameterized SurrealQL. Keep this implementation in a repository helper.
        ctx.state.sahifah_id = "sahifah:example"
        return End(ctx.state.sahifah_id)


kg_workflow = Graph(nodes=[CleanText, ExtractCandidates, PersistGraph])
```

## 8. SurrealDB Write Rules

Use Pydantic AI to propose graph records. Use SurrealDB rules to enforce truth.

Required safeguards:

- Use parameterized SurrealQL for user-provided text.
- Deduplicate `alamah` by unique label before creating new tags.
- Create `faidah` records first, then `RELATE` edges.
- Never let the model produce raw SurrealQL.
- Keep permission-sensitive writes inside worker-owned repository functions.
- Treat low-confidence relation candidates as review items, not final edges.

Example repository boundary:

```python
async def persist_extraction(db, owner_id: str, extraction: KnowledgeGraphExtraction) -> str:
    sahifah = await db.create(
        "sahifah",
        {
            "title": extraction.source_title,
            "owner": f"researcher:{owner_id}",
            "is_public": False,
        },
    )
    sahifah_id = sahifah[0]["id"]

    for item in extraction.fawaid:
        faidah = await db.create(
            "faidah",
            {
                "body": item.body,
                "source_ref": item.source_ref,
                "owner": f"researcher:{owner_id}",
                "is_public": False,
            },
        )
        faidah_id = faidah[0]["id"]

        await db.query(
            "RELATE $faidah->extracted_from->$sahifah;",
            {"faidah": faidah_id, "sahifah": sahifah_id},
        )

    return str(sahifah_id)
```

## 9. Prefect Integration

Keep Prefect as the durable pipeline runner.

```python
from prefect import flow, task


@task(name="Extract KG candidates", retries=2)
async def extract_kg_candidates(raw_text: str, owner_id: str, source_title: str) -> KnowledgeGraphExtraction:
    db = await get_db_connection()
    try:
        deps = KGDeps(owner_id=owner_id, source_title=source_title, db=db)
        result = await kg_extraction_agent.run(raw_text, deps=deps)
        return result.output
    finally:
        await db.close()


@flow(name="OpenBayan KG Ingestion")
async def ingest_knowledge_graph(raw_text: str, owner_id: str, source_title: str) -> str:
    extraction = await extract_kg_candidates(raw_text, owner_id, source_title)
    sahifah_id = await persist_kg_extraction.submit(extraction, owner_id)
    return await sahifah_id.result()
```

Use Prefect for scheduling, retries, run history, and worker deployment. Use Pydantic AI inside tasks for typed agent behavior.

## 10. Logfire Instrumentation

Configure Logfire once at worker startup, before agent runs:

```python
import logfire

logfire.configure(service_name="openbayan-ai-worker")
logfire.instrument_pydantic_ai()
logfire.instrument_httpx(capture_all=True)
```

This traces:

- model requests
- agent runs
- tool calls
- token usage
- HTTP calls to model providers
- errors and retries

Do not call `logfire.configure()` inside each task or request. Configure once per process.

## 11. Notebook Development Loop

Use notebooks for experiments only:

1. Prototype extraction prompts in `OpenBayanBackend/notebooks/experiments/`.
2. Freeze the Pydantic output schema.
3. Move reusable code to `OpenBayanBackend/notebooks/tasks/` or a worker module.
4. Wrap it with Prefect tasks.
5. Deploy flow from inside Docker.

Run Jupyter through Docker:

```bash
cd OpenBayanBackend
docker compose up -d jupyter prefect-server surrealdb
```

Then open Jupyter at `http://localhost:8888`.

## 12. Testing

Use `TestModel` for deterministic tests:

```python
from pydantic_ai.models.test import TestModel


async def test_kg_agent_schema():
    with kg_extraction_agent.override(model=TestModel()):
        result = await kg_extraction_agent.run(
            "Short source text",
            deps=KGDeps(owner_id="admin", source_title="Test", db=FakeDB()),
        )

    assert result.output is not None
```

Test boundaries:

- schema validation accepts valid extraction output
- invalid relation names fail validation
- duplicate tags are reused, not recreated
- SurrealDB writes use parameters
- low-confidence edges are not auto-persisted
- Prefect task retries do not duplicate records

Run tests inside Docker:

```bash
cd OpenBayanBackend
docker compose exec data-worker pytest
```

## 13. When Not To Use Pydantic AI

Do not use it for:

- direct browser code
- replacing SurrealDB graph traversal
- deterministic Arabic normalization that normal Python code can handle
- vector storage or BM25 search
- authorization decisions

Use SurrealDB for storage, graph traversal, indexes, and permissions. Use Python functions for deterministic text normalization. Use Pydantic AI only where LLM reasoning or structured extraction adds value.

## 14. Implementation Checklist

- [ ] Add `pydantic-ai` and `logfire[pydantic-ai,httpx]` to worker requirements.
- [ ] Rebuild `data-worker` and `jupyter` Docker images.
- [ ] Define `KnowledgeGraphExtraction` Pydantic models.
- [ ] Create a narrow extraction agent with `output_type`.
- [ ] Add SurrealDB lookup tools for deduplication only.
- [ ] Keep SurrealDB writes in repository helpers, not model-generated SQL.
- [ ] Wrap extraction in Prefect tasks.
- [ ] Enable Logfire instrumentation once per worker process.
- [ ] Add tests with `TestModel` and fake SurrealDB dependencies.
- [ ] Promote notebook experiments into reusable worker modules.

## 15. References

- Pydantic AI overview: https://pydantic.dev/docs/ai/overview/
- Pydantic AI installation: https://pydantic.dev/docs/ai/overview/install/
- Pydantic Graph overview: https://pydantic.dev/docs/ai/graph/graph/
- Pydantic AI Logfire integration: https://pydantic.dev/docs/ai/integrations/logfire/
- Pydantic AI Prefect durable execution: https://pydantic.dev/docs/ai/integrations/durable_execution/prefect/
- OpenBayan SurrealDB schema guide: [database_surrealdb_schema.md](database_surrealdb_schema.md)
- OpenBayan Prefect pipeline guide: [data_pipeline_prefect_flows.md](data_pipeline_prefect_flows.md)
- OpenBayan notebook guide: [jupyter_notebook_integration_best_practices.md](jupyter_notebook_integration_best_practices.md)
