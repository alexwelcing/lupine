# Evidence-index service — Cloud Run.
# CPU-only (MiniLM embeddings are ~5ms on CPU; GPU is wasted cost here).
# min-instances=1 to stay warm on the coordination hot path.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY gcp/evidence-index/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model into the image layer so cold starts don't
# pay the HF Hub download cost (~90MB).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY gcp/evidence-index/app.py ./app.py
COPY gcp/evidence-index/store.py ./store.py

RUN useradd -m -u 1000 evidence
USER evidence

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
