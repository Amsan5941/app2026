FROM python:3.12-slim

WORKDIR /app

# Install system deps for Pillow / torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libjpeg62-turbo-dev libpng-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create dirs
RUN mkdir -p models datasets

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
