from pathlib import Path
import sys

from prefect import flow, get_run_logger

NOTEBOOKS_DIR = Path(__file__).resolve().parents[1]
if str(NOTEBOOKS_DIR) not in sys.path:
    sys.path.insert(0, str(NOTEBOOKS_DIR))

from tasks.enrich import generate_embedding, generate_text, list_ollama_models


@flow(name="OpenBayan Dev Sample Flow")
def my_flow(text: str = "اختبار الاتصال بين جوبتر وبريفكت وأولاما") -> dict:
    logger = get_run_logger()

    models = list_ollama_models()
    embedding = generate_embedding(text)
    response = generate_text(
        "Reply in one short English sentence: OpenBayan Prefect integration works."
    )

    result = {
        "model_count": len(models),
        "embedding_dimensions": len(embedding),
        "llm_response": response.strip(),
    }
    logger.info("Dev sample result: %s", result)
    return result


if __name__ == "__main__":
    print(my_flow())
