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
    """Forcefully terminates the process if memory usage exceeds the threshold."""
    mem = get_memory_usage()
    if mem > threshold_mb:
        try:
            logger = get_run_logger()
            logger.error(f"CRITICAL: Process memory threshold exceeded ({mem:.2f} MB > {threshold_mb} MB). Auto-killing process.")
        except Exception:
            print(f"CRITICAL: Process memory threshold exceeded ({mem:.2f} MB > {threshold_mb} MB). Auto-killing process.")
        import os
        os._exit(1)

def start_memory_guard(min_available_mb: int = 500, check_interval_sec: float = 2.0):
    """
    Spawns a background daemon thread that monitors system-wide memory.
    If the host's available RAM drops below min_available_mb,
    it forcefully terminates the process using os._exit(1) to protect the devserver from freezing.
    """
    import threading
    import time
    import os
    
    def monitor():
        while True:
            try:
                virtual_mem = psutil.virtual_memory()
                available_mb = virtual_mem.available / (1024 * 1024)
                if available_mb < min_available_mb:
                    msg = (
                        f"\n[MEMORY GUARD] CRITICAL: System available memory is dangerously low: "
                        f"{available_mb:.2f} MB (Limit: {min_available_mb} MB)!\n"
                        f"[MEMORY GUARD] Forcefully killing process to prevent devserver freeze. Astagfirullah.\n"
                    )
                    try:
                        logger = get_run_logger()
                        logger.error(msg)
                    except Exception:
                        print(msg)
                    os._exit(1)
            except Exception:
                pass
            time.sleep(check_interval_sec)

    guard_thread = threading.Thread(target=monitor, daemon=True)
    guard_thread.start()

def add_source_metadata(data: dict, source: str):
    """Adds a source tag to the 'data_sources' list in the record."""
    if "data_sources" not in data:
        data["data_sources"] = []
    if source not in data["data_sources"]:
        data["data_sources"].append(source)
    return data
