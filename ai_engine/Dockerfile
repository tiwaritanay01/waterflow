# ===========================================================================
# WaterFlow OS — Python AI & Algorithmic Engine Dockerfile
# ===========================================================================

FROM python:3.11-slim

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and internal modules
COPY ai_engine/ ./ai_engine/
COPY water_engine/ ./water_engine/
COPY complaint_engine/ ./complaint_engine/
COPY config/ ./config/
COPY data/ ./data/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "ai_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
