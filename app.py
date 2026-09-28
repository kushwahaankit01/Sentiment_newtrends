import sys
import os

# Add the backend directory to Python path so main.py can be imported
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

import gradio as gr

# Import the fully configured FastAPI app from backend/main.py
# This triggers all route registrations and lifespan setup
from main import app as fastapi_app

# Minimal Gradio UI — required for HuggingFace Spaces Gradio SDK compatibility
with gr.Blocks(title="AURA Sentiment — API Backend") as demo:
    gr.Markdown("# 🧠 AURA Sentiment — Multimodal AI Backend")
    gr.Markdown(
        """
        This Space hosts the **FastAPI backend** for the AURA Sentiment project.

        ### 🔌 Available API Endpoints
        | Method | Endpoint | Description |
        |---|---|---|
        | `GET` | `/` | Health check |
        | `POST` | `/api/predict/text` | Text emotion classification (BERT-BiLSTM) |
        | `POST` | `/api/predict/image` | Facial emotion detection (YOLOv8) |
        | `POST` | `/api/predict/video` | Async video processing |
        | `GET` | `/api/predict/video/status/{task_id}` | Video task status |
        | `WS` | `/ws/webcam` | Live webcam WebSocket |

        > ⚡ **First request may take 2–3 minutes** — models are loading into memory.
        """
    )

# Mount Gradio UI at /ui on the FastAPI app.
# All FastAPI routes remain accessible at their original paths.
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")

# HuggingFace Spaces runs `python app.py` — uvicorn starts on port 7860
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860)
