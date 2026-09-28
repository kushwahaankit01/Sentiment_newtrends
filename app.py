import sys
import os
import types

# ── Polyfill for Keras 2/3 / transformers / pickle compatibility ────────────
try:
    import tf_keras as _tfk
    import tf_keras.preprocessing.text as _text
    import tf_keras.preprocessing.sequence as _seq
    import tf_keras.models as _models
    import tf_keras.layers as _layers
except ImportError:
    import tensorflow.keras as _tfk
    import tensorflow.keras.preprocessing.text as _text
    import tensorflow.keras.preprocessing.sequence as _seq
    import tensorflow.keras.models as _models
    import tensorflow.keras.layers as _layers

sys.modules["keras"] = _tfk
sys.modules["keras.src"] = _tfk
sys.modules["keras.src.legacy"] = _tfk
sys.modules["keras.src.legacy.preprocessing"] = _tfk.preprocessing
sys.modules["keras.src.legacy.preprocessing.text"] = _text
sys.modules["keras.src.legacy.preprocessing.sequence"] = _seq
sys.modules["keras.src.legacy.models"] = _models
sys.modules["keras.src.legacy.layers"] = _layers

try:
    import tf_keras.src.engine.functional as _func_mod
    sys.modules["tf_keras.src.models.functional"] = _func_mod
    sys.modules["keras.src.models.functional"] = _func_mod
except Exception as e:
    pass



BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── CRITICAL: Set ALL env vars BEFORE any TF/PyTorch imports ─────────────────
os.environ["HF_HOME"]                = "/tmp/.cache_hf"
os.environ["TRANSFORMERS_CACHE"]     = "/tmp/.cache_hf"
os.environ["TF_USE_LEGACY_KERAS"]    = "1"        # Enforce Keras 2 / tf_keras legacy behavior
os.environ["OMP_NUM_THREADS"]        = "1"        # Limit OpenMP threads
os.environ["MKL_NUM_THREADS"]        = "1"        # Limit MKL threads
os.environ["TF_NUM_INTRAOP_THREADS"] = "1"        # Limit TF intra-op threads
os.environ["TF_NUM_INTEROP_THREADS"] = "1"        # Limit TF inter-op threads
os.environ["TF_ENABLE_ONEDNN_OPTS"]  = "0"        # Disable oneDNN
os.environ["TF_CPP_MIN_LOG_LEVEL"]   = "3"        # Suppress TF noise
os.environ["PYTORCH_NO_CUDA_MEMORY_CACHING"] = "1"

os.makedirs("/tmp/.cache_hf", exist_ok=True)


# ── ZeroGPU support for HuggingFace Spaces ────────────────────────────────────
try:
    import spaces
    @spaces.GPU
    def zero_gpu_init():
        return True
    zero_gpu_init()
    print("✅ ZeroGPU function registered and executed successfully.", flush=True)
except Exception as e:
    print(f"ℹ️ Spaces info: {e}", flush=True)


# ── Diagnostic: verify model files are real binaries, not LFS pointers ───────
def check_file(label, path):
    if not os.path.exists(path):
        print(f"❌ NOT FOUND: {label} → {path}", flush=True)
        return
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        header = f.read(50)
    is_ptr = b"version https://git-lfs" in header
    tag = "⚠️  LFS POINTER (not downloaded!)" if is_ptr else "✅ binary OK"
    print(f"{tag} | {label} | {size:,} bytes", flush=True)

print("\n====== Model File Diagnostics ======", flush=True)
check_file("YOLO best.pt",    os.path.join(BASE_DIR, "model/best.pt"))
check_file("YOLO yolov8n.pt", os.path.join(BASE_DIR, "model/yolov8n.pt"))
check_file("BERT .keras",     os.path.join(BASE_DIR, "model/model_bert_v3/bert_bilstm_hybrid_v3_ft.keras"))
check_file("tokenizer.pkl",   os.path.join(BASE_DIR, "model/model_bert_v3/tokenizer.pkl"))
print("====================================\n", flush=True)

# ── Limit PyTorch threads ─────────────────────────────────────────────────────
try:
    import torch
    torch.set_num_threads(1)
    print(f"✅ PyTorch threads set to 1", flush=True)
except Exception as e:
    print(f"⚠️  Could not set torch threads: {e}", flush=True)

# ── Add backend to Python path and import FastAPI app ────────────────────────
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
from main import app

# ── HF Spaces runs `python app.py` — uvicorn starts on port 7860 ─────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860)

