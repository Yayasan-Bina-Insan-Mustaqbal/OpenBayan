# Use the requested Prefect 3.x Conda image
FROM prefecthq/prefect:3.6.27-python3.12-conda

# Switch to root to install system dependencies
USER root
RUN apt-get update && apt-get install -y gcc g++ curl && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Create a requirements file directly in the Dockerfile for simplicity
# (Prefect is already installed in the base image, so we omit it here)
RUN echo "surrealdb\ntransformers\nspacy\ncamel-tools" > requirements.txt

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download the SpaCy Arabic model for sentence segmentation
RUN python -m spacy download ar_core_news_sm

# Ensure the prefect user owns the /app directory
RUN chown -R prefect:prefect /app

# Drop back to prefect user for security
USER prefect

# The command is overridden by docker-compose.yml, but we provide a fallback
CMD ["prefect", "worker", "start", "--pool", "bayan-ingestion-pool"]
