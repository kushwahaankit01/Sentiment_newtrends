import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function VideoAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [error, setError] = useState(null);

  // File change
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setTaskId(null);
      setStatusData(null);
      setError(null);
    }
  };

  // Upload video
  const uploadVideo = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/predict/video`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setTaskId(res.data.task_id);
    } catch (err) {
      console.error(err);
      setError("Failed to upload video file.");
      setLoading(false);
    }
  };

  // Poll video status
  useEffect(() => {
    if (!taskId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/predict/video/status/${taskId}`);
        setStatusData(res.data);

        if (res.data.status === "done" || res.data.status === "failed") {
          clearInterval(pollInterval);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError("Error polling video processing status.");
        clearInterval(pollInterval);
        setLoading(false);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [taskId]);

  return (
    <div className="cyber-card" style={{ maxWidth: "850px", margin: "0 auto" }}>
      <h2 className="cyber-title" style={{ margin: "0 0 10px 0", background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        🎬 Video Timeline Lab
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 20px 0" }}>
        Upload short video files (MP4 or WebM). The backend queue extracts frames, detects face regions, classifies the emotion values of each crop, compiles annotations, and streams the finished file.
      </p>

      {error && (
        <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Input panel */}
      {!taskId && (
        <div className="upload-dropzone" style={{ padding: "40px 20px" }}>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="video-upload-input"
          />
          <label htmlFor="video-upload-input" style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
            <span style={{ fontSize: "3.5rem" }}>📁</span>
            <strong style={{ color: "#cbd5e1", fontSize: "1.1rem" }}>
              {file ? file.name : "Select your MP4 / WebM file"}
            </strong>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Supports video formats up to 50MB</span>
          </label>

          {file && (
            <button 
              onClick={uploadVideo} 
              disabled={loading} 
              className="btn-primary" 
              style={{ marginTop: "24px", minWidth: "200px" }}
            >
              {loading ? "Initializing..." : "Upload & Analyze Video"}
            </button>
          )}
        </div>
      )}

      {/* Progress Panel */}
      {taskId && statusData && statusData.status !== "done" && statusData.status !== "failed" && (
        <div className="cyber-card" style={{ background: "rgba(236, 72, 153, 0.02)", border: "1px solid rgba(236, 72, 153, 0.1)", textAlign: "center", padding: "40px" }}>
          <span style={{ fontSize: "3rem", display: "inline-block" }} className="animate-pulse">🌀</span>
          <h4 style={{ margin: "20px 0 6px 0", color: "#f8fafc", fontSize: "1.2rem" }}>Asynchronous Frame Compilation</h4>
          <p style={{ margin: "0 0 25px 0", fontSize: "0.85rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
            Task: {taskId} | Status: {statusData.status.toUpperCase()}
          </p>

          <div style={{ maxWidth: "450px", margin: "0 auto" }}>
            <div className="progress-bar-container" style={{ border: "1px solid rgba(236, 72, 153, 0.15)" }}>
              <div className="progress-bar-fill" style={{ width: `${statusData.progress}%`, background: "linear-gradient(90deg, #ec4899, #f43f5e)", boxShadow: "0 0 15px rgba(236, 72, 153, 0.4)" }} />
            </div>
            <div style={{ marginTop: "12px", fontSize: "0.9rem", color: "#cbd5e1", fontWeight: "700" }}>
              {statusData.progress}% processed
            </div>
          </div>
        </div>
      )}

      {/* Done State */}
      {statusData && statusData.status === "done" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          <div className="cyber-card" style={{ background: "rgba(16, 185, 129, 0.02)", borderColor: "rgba(16, 185, 129, 0.15)", textAlign: "center" }}>
            <h4 style={{ color: "#10b981", margin: "0 0 10px 0", fontSize: "1.3rem" }}>✅ Video Compilation Completed!</h4>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 25px 0" }}>
              Facial expression timelines successfully mapped to local file storage. Play or download the processed video below.
            </p>

            <video 
              controls 
              src={`${BACKEND_URL}${statusData.url}`} 
              style={{ width: "100%", maxHeight: "420px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", background: "#020617" }}
            />

            <div style={{ marginTop: "25px", display: "flex", justifyContent: "center", gap: "15px" }}>
              <a 
                href={`${BACKEND_URL}${statusData.url}`} 
                download={`processed_${taskId}.mp4`}
                className="btn-primary"
                style={{ textDecoration: "none", display: "inline-block", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)" }}
              >
                📥 Download Output File
              </a>
              <button 
                onClick={() => { setTaskId(null); setStatusData(null); setFile(null); }} 
                className="btn-primary"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8", boxShadow: "none" }}
              >
                Upload New File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed State */}
      {statusData && statusData.status === "failed" && (
        <div className="cyber-card" style={{ background: "rgba(239, 68, 68, 0.02)", borderColor: "rgba(239, 68, 68, 0.15)", textAlign: "center" }}>
          <h4 style={{ color: "#ef4444", margin: "0 0 10px 0", fontSize: "1.2rem" }}>❌ Compilation Failure</h4>
          <p style={{ color: "#cbd5e1", fontSize: "0.9rem", margin: "0 0 20px 0" }}>
            Error report: {statusData.error || "Unknown compilation exception"}
          </p>
          <button 
            onClick={() => { setTaskId(null); setStatusData(null); setFile(null); }} 
            className="btn-primary"
            style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", boxShadow: "0 8px 24px rgba(239, 68, 68, 0.3)" }}
          >
            Reset Portal
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoAnalyzer;
