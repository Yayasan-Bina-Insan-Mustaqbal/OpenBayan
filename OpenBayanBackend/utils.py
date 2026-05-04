import os
import psutil
from prefect import get_run_logger

def get_memory_usage():
    """Returns the current RSS memory usage of the process in MB."""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

def log_memory_status(context_name: str):
    """Logs current memory usage and returns it."""
    try:
        logger = get_run_logger()
        mem = get_memory_usage()
        logger.info(f"MEMORY [{context_name}]: {mem:.2f} MB")
        return mem
    except Exception:
        # Fallback if logger is not available
        mem = get_memory_usage()
        print(f"MEMORY [{context_name}]: {mem:.2f} MB")
        return mem

def check_memory_threshold(threshold_mb: int = 4000):
    """Raises an error if memory usage exceeds the threshold."""
    mem = get_memory_usage()
    if mem > threshold_mb:
        logger = get_run_logger()
        logger.error(f"CRITICAL: Memory threshold exceeded ({mem:.2f} MB > {threshold_mb} MB). Auto-killing process.")
        raise MemoryError(f"Memory threshold exceeded: {mem:.2f} MB")

def add_source_metadata(data: dict, source: str):
    """Adds a source tag to the 'data_sources' list in the record."""
    if "data_sources" not in data:
        data["data_sources"] = []
    if source not in data["data_sources"]:
        data["data_sources"].append(source)
    return data
