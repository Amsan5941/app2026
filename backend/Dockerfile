# ============================================================
# GrindApp – Backend (FastAPI) Dockerfile
# ============================================================

FROM python:3.12-slim

WORKDIR /app

# System deps for Pillow / torch CPU
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libjpeg62-turbo-dev libpng-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (cached layer — only re-runs when requirements change)
COPY requirements.txt .

# Install CPU-only torch first to keep image lean (avoids the 4 GB CUDA build).
# If you need GPU support, remove this line and let requirements.txt handle it.
RUN pip install --no-cache-dir \
    torch==2.5.1+cpu torchvision==0.20.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Copy source (docker-compose mounts over this for hot-reload)
COPY . .

# Create persistent dirs
RUN mkdir -p models datasets logs

EXPOSE 8000

# --reload enables hot-reload when source is mounted via docker-compose volume
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
