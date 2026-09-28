import os
import re
import torch

# PyTorch 2.6 compatibility fix for YOLO model loading
orig_load = torch.load
torch.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, "weights_only": False})


# ----------------- Set Hugging Face Cache to Project Directory -----------------
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
HF_CACHE_DIR = os.path.join(PROJECT_ROOT, ".cache_hf")
os.environ["HF_HOME"] = HF_CACHE_DIR
os.environ["TRANSFORMERS_CACHE"] = HF_CACHE_DIR
os.makedirs(HF_CACHE_DIR, exist_ok=True)

import uuid

import base64
import logging
import warnings
import pickle
import threading
import subprocess
import static_ffmpeg
from contextlib import asynccontextmanager
from typing import List, Dict

import cv2
import numpy as np
import pandas as pd
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# NLTK imports
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Suppress logs
warnings.filterwarnings("ignore")

# Define Paths
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(os.path.dirname(PROJECT_ROOT), "model")

YOLO_MODEL_PATH = os.path.join(MODEL_DIR, "best.pt")
TEXT_MODEL_PATH = os.path.join(MODEL_DIR, "model_bert_v3", "bert_bilstm_hybrid_v3_ft.keras")
TOKENIZER_PATH = os.path.join(MODEL_DIR, "model_bert_v3", "tokenizer.pkl")
LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, "model_bert_v3", "label_encoder.pkl")
BERT_TOKENIZER_DIR = os.path.join(MODEL_DIR, "model_bert_v3")

STATIC_DIR = os.path.join(PROJECT_ROOT, "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# Register Custom Keras Layer for loading
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import sys
import types

class KerasLegacyPolyfill(types.ModuleType):
    def __getattr__(self, name):
        try:
            import tf_keras
            return getattr(tf_keras, name)
        except Exception:
            return None

for mod_name in [
    "keras.src",
    "keras.src.legacy",
    "keras.src.legacy.saved_model",
    "keras.src.legacy.preprocessing",
    "keras.src.legacy.preprocessing.image",
]:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = KerasLegacyPolyfill(mod_name)

import tensorflow as tf

try:
    import tf_keras as keras
    from tf_keras.layers import Layer
    from tf_keras.models import load_model
    from tf_keras.preprocessing.sequence import pad_sequences
    register_keras = keras.utils.register_keras_serializable
except Exception:
    keras = tf.keras
    from tensorflow.keras.layers import Layer
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    register_keras = tf.keras.utils.register_keras_serializable

@register_keras()
class HF_Bert_Layer(Layer):


    def __init__(self, model_name="bert-base-uncased", trainable_layers=4, **kwargs):
        super().__init__(**kwargs)
        self.model_name = model_name
        self.trainable_layers = trainable_layers
        from transformers import TFAutoModel
        self.hf_model = TFAutoModel.from_pretrained(model_name, from_pt=True)
        self.hf_model.trainable = True

        try:
            for layer in self.hf_model.bert.encoder.layer[:-trainable_layers]:
                layer.trainable = False
        except Exception:
            for layer in self.hf_model.encoder.layer[:-trainable_layers]:
                layer.trainable = False

    def call(self, inputs, training=False):
        input_ids, attention_mask = inputs
        outputs = self.hf_model(
            {
                "input_ids": tf.cast(input_ids, tf.int32),
                "attention_mask": tf.cast(attention_mask, tf.int32),
            },
            training=training
        )
        return outputs.last_hidden_state

    def get_config(self):
        config = super().get_config()
        config.update({
            "model_name": self.model_name,
            "trainable_layers": self.trainable_layers
        })
        return config

# Global ML models cache
models = {}
video_tasks = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup NLTK
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    
    print("Initializing models in lifespan...")
    
    # 1. Load YOLO Model
    try:
        from ultralytics import YOLO
        models["yolo"] = YOLO(YOLO_MODEL_PATH)
        models["yolo"].to("cpu")
        print("YOLO Model loaded successfully on CPU!")
    except Exception as e:
        print(f"Failed to load YOLO: {e}")
        models["yolo"] = None
        
    # 2. Load BERT NLP tokenizer and hybrid model
    try:
        from transformers import BertTokenizer
        
        with open(TOKENIZER_PATH, "rb") as f:
            models["glove_tokenizer"] = pickle.load(f)
        with open(LABEL_ENCODER_PATH, "rb") as f:
            models["label_encoder"] = pickle.load(f)
            
        models["bert_tokenizer"] = BertTokenizer.from_pretrained(BERT_TOKENIZER_DIR)
        
        custom_objects = {"HF_Bert_Layer": HF_Bert_Layer}
        models["text_model"] = load_model(TEXT_MODEL_PATH, custom_objects=custom_objects, compile=False)
        models["lemmatizer"] = WordNetLemmatizer()
        models["stop_words"] = set(stopwords.words('english'))
        print("BERT Text Model loaded successfully!")
    except Exception as e:
        import traceback
        print(f"Failed to load BERT NLP model: {e}")
        traceback.print_exc()
        models["text_model"] = None


    yield
    models.clear()
    print("Models cleaned up.")

app = FastAPI(lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class TextPayload(BaseModel):
    text: str

# ----------------- NLP Helper Functions -----------------
def clean_text(text: str) -> str:
    lemmatizer = models.get("lemmatizer")
    stop_words = models.get("stop_words")
    if not lemmatizer or not stop_words:
        return text.lower()
        
    text = str(text).lower()
    text = re.sub(r"[^a-z\s]", "", text)
    tokens = [lemmatizer.lemmatize(w) for w in text.split() if w not in stop_words]
    return " ".join(tokens)

# ----------------- CV Sentiment & Probability Helpers -----------------
EMOTION_TO_SENTIMENT = {
    "Anger": "negative",
    "Contempt": "negative",
    "Disgust": "negative",
    "Fear": "negative",
    "Happy": "positive",
    "Neutral": "neutral",
    "Sad": "negative",
    "Surprise": "positive",
}

def get_mapped_sentiment(emotion: str) -> str:
    return EMOTION_TO_SENTIMENT.get(emotion, "neutral")

def get_top_emotions(probs, names, limit=3):
    top5_indices = probs.top5
    top5_confs = probs.top5conf
    
    top_list = []
    for idx, conf in zip(top5_indices[:limit], top5_confs[:limit]):
        emo = names[int(idx)]
        top_list.append({
            "emotion": emo,
            "confidence": float(conf),
            "sentiment": get_mapped_sentiment(emo)
        })
    return top_list

# ----------------- API Endpoints -----------------

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "FastAPI Multimodal Sentiment & Emotion Analysis Engine is Running"
    }

# --- Predict Endpoints (BERT + YOLO) ---

@app.post("/api/predict/text")
def predict_text(payload: TextPayload):
    text_model = models.get("text_model")
    glove_tokenizer = models.get("glove_tokenizer")
    bert_tokenizer = models.get("bert_tokenizer")
    label_encoder = models.get("label_encoder")

    if not text_model or not glove_tokenizer or not bert_tokenizer:
        raise HTTPException(status_code=503, detail="Text analysis model is not ready.")

    try:
        # Preprocess
        cleaned = clean_text(payload.text)
        glove_seq = glove_tokenizer.texts_to_sequences([cleaned])
        glove_pad = pad_sequences(glove_seq, maxlen=150, padding='post', truncating='post')

        bert_enc = bert_tokenizer([payload.text], padding='max_length', truncation=True,
                                  max_length=128, return_tensors='np')
        
        input_ids = bert_enc["input_ids"]
        attention_mask = bert_enc["attention_mask"]

        # Predict
        preds = text_model.predict([glove_pad, input_ids, attention_mask], verbose=0)
        probs = preds[0]

        emotion = label_encoder.inverse_transform([np.argmax(probs)])[0]
        confidence = float(np.max(probs) * 100)
        all_probs = {cls: float(p * 100) for cls, p in zip(label_encoder.classes_, probs)}

        emotion_to_sentiment = {
            "joy": "positive",
            "love": "positive",
            "anger": "negative",
            "sadness": "negative",
            "fear": "negative",
            "surprise": "neutral",
            "neutral": "neutral"
        }
        sentiment = emotion_to_sentiment.get(emotion, "neutral")

        return {
            "emotion": emotion,
            "confidence": round(confidence, 2),
            "sentiment": sentiment,
            "probabilities": all_probs,
            "original_text": payload.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")

@app.post("/api/predict/image")
async def predict_image(file: UploadFile = File(...)):
    yolo_model = models.get("yolo")
    if not yolo_model:
        raise HTTPException(status_code=503, detail="YOLO model is not ready.")

    try:
        # Read uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        detections = []
        color_map = {
            "Anger": (0, 0, 255),        # Red
            "Contempt": (128, 0, 128),   # Purple
            "Disgust": (0, 128, 0),      # Dark Green
            "Fear": (128, 0, 0),         # Dark Blue
            "Happy": (0, 255, 255),      # Yellow
            "Neutral": (128, 128, 128),  # Gray
            "Sad": (255, 0, 0),          # Blue
            "Surprise": (0, 165, 255),   # Orange
        }

        # Face Detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        if len(faces) > 0:
            for (x, y, w, h) in faces:
                face_crop = img[y:y+h, x:x+w]
                if face_crop.size == 0:
                    continue
                results = yolo_model(face_crop, verbose=False)
                res = results[0]
                
                top_idx = int(res.probs.top1)
                confidence = float(res.probs.top1conf)
                emo_label = res.names[top_idx]
                color = color_map.get(emo_label, (255, 255, 255))

                cv2.rectangle(img, (x, y), (x+w, y+h), color, 2)
                cv2.putText(img, f"{emo_label} ({confidence*100:.1f}%)", (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                top_emotions = get_top_emotions(res.probs, res.names, limit=3)
                detections.append({
                    "emotion": emo_label,
                    "confidence": confidence,
                    "sentiment": get_mapped_sentiment(emo_label),
                    "top_emotions": top_emotions
                })
        else:
            # Fallback to whole frame if no face is detected
            results = yolo_model(img, verbose=False)
            res = results[0]
            top_idx = int(res.probs.top1)
            confidence = float(res.probs.top1conf)
            emo_label = res.names[top_idx]
            color = color_map.get(emo_label, (255, 255, 255))

            cv2.putText(img, f"{emo_label} ({confidence*100:.1f}%)", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

            top_emotions = get_top_emotions(res.probs, res.names, limit=3)
            detections.append({
                "emotion": emo_label,
                "confidence": confidence,
                "sentiment": get_mapped_sentiment(emo_label),
                "top_emotions": top_emotions
            })

        # Encode back to base64
        _, buffer = cv2.imencode('.jpg', img)
        encoded_image = base64.b64encode(buffer).decode('utf-8')

        return {
            "detections": detections,
            "image_base64": f"data:image/jpeg;base64,{encoded_image}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

# --- Background Task Video Processing ---

def process_video_task(task_id: str, temp_in_path: str, output_path: str):
    yolo_model = models.get("yolo")
    if not yolo_model:
        video_tasks[task_id] = {"status": "failed", "progress": 0, "error": "YOLO model not loaded"}
        return

    try:
        cap = cv2.VideoCapture(temp_in_path)
        if not cap.isOpened():
            video_tasks[task_id] = {"status": "failed", "progress": 0, "error": "Could not open video file"}
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 24
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Write output video using mp4v to a temporary path first
        temp_out_path = os.path.join(STATIC_DIR, f"temp_out_{task_id}.mp4")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_out_path, fourcc, fps, (width, height))

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Face Detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            # Strict parameters to minimize false positives in background (scaleFactor=1.2, minNeighbors=6, minSize=50x50)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=6, minSize=(50, 50))
            
            color_map = {
                "Anger": (0, 0, 255),        # Red
                "Contempt": (128, 0, 128),   # Purple
                "Disgust": (0, 128, 0),      # Dark Green
                "Fear": (128, 0, 0),         # Dark Blue
                "Happy": (0, 255, 255),      # Yellow
                "Neutral": (128, 128, 128),  # Gray
                "Sad": (255, 0, 0),          # Blue
                "Surprise": (0, 165, 255),   # Orange
            }

            if len(faces) > 0:
                for (x, y, w, h) in faces:
                    face_crop = frame[y:y+h, x:x+w]
                    if face_crop.size == 0:
                        continue
                    results = yolo_model(face_crop, verbose=False)
                    res = results[0]
                    
                    top_idx = int(res.probs.top1)
                    confidence = float(res.probs.top1conf)
                    emo_label = res.names[top_idx]
                    color = color_map.get(emo_label, (255, 255, 255))

                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                    cv2.putText(frame, f"{emo_label} ({confidence*100:.1f}%)", (x, y - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

            out.write(frame)
            frame_idx += 1
            progress = int((frame_idx / total_frames) * 100) if total_frames > 0 else 50
            video_tasks[task_id]["progress"] = min(progress, 99)

        cap.release()
        out.release()

        # Transcode the raw OpenCV video output to standard H.264 for HTML5 browser compatibility
        try:
            static_ffmpeg.add_paths()
            cmd = f'ffmpeg -y -i "{temp_out_path}" -vcodec libx264 -pix_fmt yuv420p "{output_path}"'
            subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as trans_err:
            print(f"Video transcoding failed, falling back to raw output: {trans_err}")
            if os.path.exists(temp_out_path):
                if os.path.exists(output_path):
                    os.unlink(output_path)
                os.rename(temp_out_path, output_path)

        # Cleanup raw temporary output file
        if os.path.exists(temp_out_path):
            try:
                os.unlink(temp_out_path)
            except:
                pass

        video_tasks[task_id] = {
            "status": "done",
            "progress": 100,
            "url": f"/static/processed_{task_id}.mp4"
        }
    except Exception as e:
        video_tasks[task_id] = {"status": "failed", "progress": 0, "error": str(e)}
    finally:
        # Clean up temporary uploaded input video
        if os.path.exists(temp_in_path):
            try:
                os.unlink(temp_in_path)
            except:
                pass

@app.post("/api/predict/video")
async def start_video_analysis(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    task_id = str(uuid.uuid4())
    video_tasks[task_id] = {"status": "queued", "progress": 0, "error": None}

    # Save uploaded file temporarily
    temp_in_path = os.path.join(STATIC_DIR, f"temp_in_{task_id}.mp4")
    output_path = os.path.join(STATIC_DIR, f"processed_{task_id}.mp4")

    with open(temp_in_path, "wb") as buffer:
        buffer.write(await file.read())

    video_tasks[task_id]["status"] = "processing"
    background_tasks.add_task(process_video_task, task_id, temp_in_path, output_path)

    return {"task_id": task_id, "status": "processing"}

@app.get("/api/predict/video/status/{task_id}")
def get_video_status(task_id: str):
    if task_id not in video_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return video_tasks[task_id]

# --- WebSockets endpoints ---

@app.websocket("/ws/webcam")
async def websocket_webcam(websocket: WebSocket):
    await websocket.accept()
    print("Webcam WebSocket client connected.")
    yolo_model = models.get("yolo")
    
    try:
        while True:
            # Receive base64 frame from React frontend
            data = await websocket.receive_text()
            if data.startswith("data:image"):
                data = data.split(",")[1]
            
            # Decode frame
            img_bytes = base64.b64decode(data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            detections = []
            if frame is not None and yolo_model is not None:
                h, w, _ = frame.shape
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                # Strict parameters to minimize false positives in background (scaleFactor=1.2, minNeighbors=6, minSize=50x50)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=6, minSize=(50, 50))

                if len(faces) > 0:
                    for (x, y, fw, fh) in faces:
                        face_crop = frame[y:y+fh, x:x+fw]
                        if face_crop.size == 0:
                            continue
                        
                        results = yolo_model(face_crop, verbose=False)
                        res = results[0]
                        top_idx = int(res.probs.top1)
                        confidence = float(res.probs.top1conf)
                        emo_label = res.names[top_idx]
                        
                        top_emotions = get_top_emotions(res.probs, res.names, limit=3)
                        detections.append({
                            "emotion": emo_label,
                            "confidence": float(confidence),
                            "sentiment": get_mapped_sentiment(emo_label),
                            "top_emotions": top_emotions,
                            "bbox": [int(x), int(y), int(x+fw), int(y+fh)],
                            "relative_bbox": [float(x/w), float(y/h), float((x+fw)/w), float((y+fh)/h)]
                        })
            
            await websocket.send_json({"detections": detections})
            
    except WebSocketDisconnect:
        print("Webcam WebSocket client disconnected.")
    except Exception as e:
        print(f"Error in Webcam WebSocket loop: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass

# Start application via Uvicorn if run directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
