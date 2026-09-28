---
title: Aura Sentiment Backend
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: gradio
sdk_version: 5.0.0
app_file: app.py
pinned: false
---

# 🧠 AURA SENTIMENT — Multimodal AI Sentiment & Emotion Analysis

A FastAPI-based multimodal AI engine for sentiment and emotion analysis using:
- **YOLOv8** — Facial emotion detection (8 emotions)
- **BERT-BiLSTM Hybrid** — Text sentiment classification
- **OpenCV** — Face detection pipeline

## Project Structure

```
├── app.py              ← HuggingFace Spaces entry point (Gradio wrapper)
├── backend/            ← FastAPI backend
│   └── main.py         ← API routes (text, image, video, webcam)
├── model/              ← Trained model files
│   ├── best.pt         ← YOLOv8 custom emotion classifier
│   └── model_bert_v3/  ← BERT-BiLSTM Keras model
└── frontend/           ← React + Vite UI
```
