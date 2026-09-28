import sys
import os

# Add the backend directory to Python path so main.py can be imported
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

# Import the fully configured FastAPI app from backend/main.py
# No Gradio needed — HF Spaces just needs something listening on port 7860
from main import app

# HuggingFace Spaces runs `python app.py` — uvicorn starts the FastAPI server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860)
