---
title: Aura Sentiment Backend
emoji: 🧠
colorFrom: indigo
colorTo: cyan
sdk: docker
pinned: false
app_port: 7860
---

# AURA SENTIMENT — FastAPI Backend

Multimodal AI sentiment & emotion analysis engine.

## Endpoints

- `GET /` — Health check
- `POST /api/predict/text` — Text emotion classification (BERT-BiLSTM)
- `POST /api/predict/image` — Facial emotion detection (YOLOv8)
- `POST /api/predict/video` — Video processing (async background task)
- `GET /api/predict/video/status/{task_id}` — Video task status
- `WS /ws/webcam` — Live webcam WebSocket stream
