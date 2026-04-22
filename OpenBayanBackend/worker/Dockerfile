# Use the requested Prefect 3.x Conda image
FROM prefecthq/prefect:3.6.27-python3.12-conda

# Switch to root to install system dependencies
USER root
RUN apt-get update && apt-get install -y gcc g++ curl && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Create a requirements file directly in the Dockerfile for simplicity
# (Prefect is already installed in the base image, so we omit it here)
RUN echo "surrealdb" > requirements.txt && \
    echo "transformers" >> requirements.txt && \
    echo "spacy" >> requirements.txt && \
    echo "camel-tools" >> requirements.txt

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download CAMeL Tools default datasets (required for Analyzer)
# Note: This is around 500MB
RUN camel_data -i defaults

# (Running as root for simplicity in dev environment)
# (No official SpaCy Arabic model exists, so we use blank("ar") in code if needed)

# The command is overridden by docker-compose.yml, but we provide a fallback
CMD ["prefect", "worker", "start", "--pool", "bayan-ingestion-pool"]
