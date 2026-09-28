import { useState } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const emojiMap = {
  Anger: "😡 Anger",
  Contempt: "😒 Contempt",
  Disgust: "🤢 Disgust",
  Fear: "😱 Fear",
  Happy: "😊 Happy",
  Neutral: "😐 Neutral",
  Sad: "😢 Sadness",
  Surprise: "😮 Surprise",
};

const colors = {
  Happy: "#eab308",
  Neutral: "#94a3b8",
  Surprise: "#f97316",
  Sad: "#3b82f6",
  Anger: "#ef4444",
  Fear: "#a855f7",
  Disgust: "#22c55e",
};

function ImageAnalyzer() {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const uploadImage = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", imageFile);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/predict/image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-card" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <h2 className="cyber-title" style={{ margin: "0 0 10px 0" }}>🖼️ Image Emotion Studio</h2>
      <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 20px 0" }}>
        Upload any photograph containing faces. The engine will run OpenCV face detection, crop out each face, classify their expressions, and draw annotated highlights.
      </p>

      {error && (
        <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "30px", justifyContent: "center" }}>
        {/* Upload & Preview Side */}
        <div style={{ flex: "1.2", minWidth: "300px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="upload-dropzone">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              id="img-upload-input" 
              style={{ display: "none" }}
            />
            <label htmlFor="img-upload-input" style={{ cursor: "pointer", display: "block", padding: "40px 20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px" }}>📸</div>
              <strong style={{ color: "#cbd5e1" }}>Click to select a photograph</strong>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "8px" }}>Supports JPG, PNG, WEBP</div>
            </label>
          </div>

          {previewUrl && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ position: "relative", width: "100%", maxHeight: "400px", background: "#020617", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                <img 
                  src={result ? result.image_base64 : previewUrl} 
                  alt="Preview" 
                  style={{ width: "100%", maxHeight: "400px", objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              </div>

              {!result && (
                <button 
                  onClick={uploadImage} 
                  disabled={loading} 
                  className="btn-primary"
                  style={{ width: "100%" }}
                >
                  {loading ? "Analyzing Faces..." : "✨ Run Emotion Pipeline"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Sidebar */}
        {result && (
          <div style={{ flex: "0.8", minWidth: "250px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="cyber-card" style={{ background: "rgba(255,255,255,0.01)", height: "100%" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#cbd5e1", fontSize: "1.1rem" }}>🔍 Expression Analytics</h3>
              
              {result.detections.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {result.detections.map((det, idx) => {
                    const color = colors[det.emotion] || "#06b6d4";
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: "20px", 
                          background: `${color}05`, 
                          borderRadius: "12px", 
                          border: `1px solid ${color}20`,
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: color }}>
                              {emojiMap[det.emotion] || det.emotion}
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Detected Face #{idx + 1}</span>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                            <span style={{ 
                              padding: "2px 8px", 
                              borderRadius: "12px", 
                              fontSize: "0.7rem", 
                              fontWeight: "800",
                              textTransform: "uppercase",
                              background: det.sentiment === "positive" ? "rgba(16, 185, 129, 0.15)" : det.sentiment === "negative" ? "rgba(239, 68, 68, 0.15)" : "rgba(148, 163, 184, 0.15)",
                              color: det.sentiment === "positive" ? "#10b981" : det.sentiment === "negative" ? "#ef4444" : "#94a3b8"
                            }}>
                              {det.sentiment}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "#f8fafc", fontWeight: "700" }}>
                              {Math.round(det.confidence * 100)}% Conf
                            </span>
                          </div>
                        </div>

                        {det.top_emotions && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "10px" }}>
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Top Predictions</span>
                            {det.top_emotions.map((top, tIdx) => (
                              <div key={tIdx} style={{ fontSize: "0.8rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", marginBottom: "3px" }}>
                                  <span>{emojiMap[top.emotion] || top.emotion}</span>
                                  <span style={{ fontWeight: "600" }}>{Math.round(top.confidence * 100)}%</span>
                                </div>
                                <div className="progress-bar-container" style={{ height: "4px" }}>
                                  <div className="progress-bar-fill" style={{ width: `${top.confidence * 100}%`, background: colors[top.emotion] || "#06b6d4", height: "100%" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "#475569" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🤷</div>
                  No faces detected. Classified the entire image as a fallback.
                </div>
              )}

              <button 
                onClick={() => {
                  setImageFile(null);
                  setPreviewUrl(null);
                  setResult(null);
                }} 
                className="btn-primary" 
                style={{ width: "100%", marginTop: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8" }}
              >
                Clear and Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageAnalyzer;
