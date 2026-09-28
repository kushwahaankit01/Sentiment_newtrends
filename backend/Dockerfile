# ── Base image ──────────────────────────────────────────────────────────────
FROM python:3.10-slim

# ── System dependencies (OpenCV + ffmpeg) ───────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ────────────────────────────────────────────────────────
WORKDIR /app

# ── Copy model files into image ──────────────────────────────────────────────
COPY model/ /model/

# ── Install Python dependencies ──────────────────────────────────────────────
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy backend source code ─────────────────────────────────────────────────
COPY backend/ .

# ── Expose port 7860 (HuggingFace Spaces default) ───────────────────────────
EXPOSE 7860

# ── Start FastAPI via Uvicorn ────────────────────────────────────────────────
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
