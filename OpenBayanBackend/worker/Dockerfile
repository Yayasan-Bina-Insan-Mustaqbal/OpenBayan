# Use the requested Prefect 3.x Conda image
FROM prefecthq/prefect:3.6.27-python3.12-conda

# Switch to root to install system dependencies
USER root
RUN apt-get update && apt-get install -y gcc g++ curl && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Prefect is already installed in the base image, so we omit it here.
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download only the CAMeL Tools MSA data needed for local morphology.
# Heavier inference/embedding work can be pointed at an external Ollama host.
RUN camel_data -i morphology-db-msa-r13 && \
    camel_data -i disambig-mle-calima-msa-r13

# Make ad-hoc docker compose exec commands use the same Python env as Prefect/Jupyter.
ENV PATH="/opt/conda/envs/prefect/bin:${PATH}"

# (Running as root for simplicity in dev environment)
# (No official SpaCy Arabic model exists, so we use blank("ar") in code if needed)

# The command is overridden by docker-compose.yml, but we provide a fallback
CMD ["prefect", "worker", "start", "--pool", "bayan-ingestion-pool"]
