import { useEffect, useRef, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws/webcam";

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

function WebcamAnalyzer() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [detections, setDetections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  // Start webcam
  const startCamera = async () => {
    setError(null);
    setLogs([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamActive(true);
      connectWebSocket();
    } catch (err) {
      console.error(err);
      setError("Failed to access camera. Please check permissions.");
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setDetections([]);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Connect WebSocket
  const connectWebSocket = () => {
    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log("Webcam WebSocket opened.");
      startFrameSending();
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.detections) {
          setDetections(data.detections);
          
          // Add to rolling history log if an emotion was detected and it has changed
          if (data.detections.length > 0) {
            const primary = data.detections[0];
            const timestamp = new Date().toLocaleTimeString();
            setLogs((prev) => {
              if (prev.length > 0 && prev[0].emotion === primary.emotion) {
                return prev;
              }
              return [
                { time: timestamp, emotion: primary.emotion, conf: primary.confidence },
                ...prev.slice(0, 19)
              ];
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    wsRef.current.onerror = (err) => {
      console.error("WS error:", err);
      setError("WebSocket connection failed. Verify server is online.");
    };

    wsRef.current.onclose = () => {
      console.log("Webcam WebSocket closed.");
    };
  };

  // Send frames at interval
  const startFrameSending = () => {
    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.width = 640;
    hiddenCanvas.height = 480;
    const ctx = hiddenCanvas.getContext("2d");

    intervalRef.current = setInterval(() => {
      if (
        wsRef.current && 
        wsRef.current.readyState === WebSocket.OPEN && 
        videoRef.current && 
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const dataUrl = hiddenCanvas.toDataURL("image/jpeg", 0.5); // compress quality
        wsRef.current.send(dataUrl);
      }
    }, 150); // Send 7 frames per second for low latency
  };

  // Draw bounding boxes on the overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) return;

    detections.forEach((det) => {
      const [rx1, ry1, rx2, ry2] = det.relative_bbox;
      const x = rx1 * canvas.width;
      const y = ry1 * canvas.height;
      const w = (rx2 - rx1) * canvas.width;
      const h = (ry2 - ry1) * canvas.height;

      const color = colors[det.emotion] || "#06b6d4";

      // Draw glowing bounding box
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Reset shadows for text rendering
      ctx.shadowBlur = 0;

      // Draw tag background
      ctx.fillStyle = color;
      ctx.font = "bold 14px 'Plus Jakarta Sans'";
      const label = `${emojiMap[det.emotion] || det.emotion} (${Math.round(det.confidence * 100)}%)`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x - 1, y - 28, textWidth + 16, 28);

      // Draw tag text
      ctx.fillStyle = "#000000";
      ctx.fillText(label, x + 8, y - 9);
    });
  }, [detections]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="cyber-card" style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <h2 className="cyber-title" style={{ margin: "0 0 10px 0", background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        📹 Live Webcam Arena
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 20px 0" }}>
        Connect a local webcam stream to the FastAPI engine. Frames are processed asynchronously, utilizing OpenCV face detection cascades to feed face crops to YOLOv8 classification.
      </p>

      {error && (
        <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "30px", justifyContent: "center" }}>
        
        {/* Stream Area */}
        <div style={{ position: "relative", width: "640px", height: "480px", background: "#020617", borderRadius: "16px", overflow: "hidden", border: "2px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} // Mirror
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", transform: "scaleX(-1)" }} // Mirror
          />

          {!streamActive && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "15px", color: "#475569" }}>
              <span style={{ fontSize: "4rem" }}>🎥</span>
              <strong style={{ color: "#cbd5e1" }}>Webcam stream offline</strong>
              <button onClick={startCamera} className="btn-primary" style={{ marginTop: "10px" }}>
                Activate Camera
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Info & Logs */}
        <div style={{ flex: "1", minWidth: "280px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {streamActive && (
            <button 
              onClick={stopCamera} 
              className="btn-primary" 
              style={{ 
                width: "100%", 
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", 
                boxShadow: "0 8px 24px rgba(239, 68, 68, 0.3)" 
              }}
            >
              Disconnect Stream
            </button>
          )}

          {streamActive && detections.length > 0 && (
            <div className="cyber-card" style={{ background: "rgba(255,255,255,0.01)", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h4 style={{ margin: 0, color: "#cbd5e1", fontSize: "0.95rem", fontWeight: "700" }}>🧠 Expression Diagnostics</h4>
                <span style={{ 
                  padding: "2px 8px", 
                  borderRadius: "12px", 
                  fontSize: "0.7rem", 
                  fontWeight: "800",
                  textTransform: "uppercase",
                  background: detections[0].sentiment === "positive" ? "rgba(16, 185, 129, 0.15)" : detections[0].sentiment === "negative" ? "rgba(239, 68, 68, 0.15)" : "rgba(148, 163, 184, 0.15)",
                  color: detections[0].sentiment === "positive" ? "#10b981" : detections[0].sentiment === "negative" ? "#ef4444" : "#94a3b8"
                }}>
                  {detections[0].sentiment}
                </span>
              </div>
              
              {detections[0].top_emotions && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {detections[0].top_emotions.map((top, tIdx) => (
                    <div key={tIdx} style={{ fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", marginBottom: "3px" }}>
                        <span style={{ fontWeight: tIdx === 0 ? "700" : "400" }}>{emojiMap[top.emotion] || top.emotion}</span>
                        <span style={{ fontWeight: "700" }}>{Math.round(top.confidence * 100)}%</span>
                      </div>
                      <div className="progress-bar-container" style={{ height: "4px" }}>
                        <div className="progress-bar-fill" style={{ width: `${top.confidence * 100}%`, background: colors[top.emotion] || "#06b6d4", height: "100%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="cyber-card" style={{ background: "rgba(255,255,255,0.01)", padding: "20px", display: "flex", flexDirection: "column", height: "250px", overflow: "hidden" }}>
            <h4 style={{ margin: "0 0 15px 0", color: "#cbd5e1", fontSize: "1rem" }}>📈 Rolling Expression Feed</h4>
            
            {logs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1, paddingRight: "4px" }}>
                {logs.map((log, idx) => {
                  const color = colors[log.emotion] || "#06b6d4";
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        padding: "8px 12px", 
                        background: "rgba(255,255,255,0.01)", 
                        borderRadius: "8px", 
                        borderLeft: `3px solid ${color}`,
                        fontSize: "0.85rem",
                        fontFamily: "'JetBrains Mono', monospace"
                      }}
                    >
                      <span style={{ color: "#64748b" }}>[{log.time}]</span>
                      <strong style={{ color: color }}>{emojiMap[log.emotion] || log.emotion}</strong>
                      <span style={{ color: "#94a3b8" }}>{Math.round(log.conf * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#475569", margin: "auto", fontSize: "0.9rem", textAlign: "center" }}>
                {streamActive ? "Awaiting face detections..." : "Camera offline. Start webcam to display real-time expression tracking."}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default WebcamAnalyzer;
