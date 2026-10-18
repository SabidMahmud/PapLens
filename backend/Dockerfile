FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    TORCH_THREADS=4 \
    ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Install minimal OS dependencies for OpenCV headless and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (UID 1000 standard for Hugging Face Spaces)
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install dependencies using CPU PyTorch
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source and model weights
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser weights/ ./weights/

USER appuser

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
