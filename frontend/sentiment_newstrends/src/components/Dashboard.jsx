import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      {/* Welcome Hero Area */}
      <section className="hero-container">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        <div className="hero-content">
          <span className="badge-glow">MULTIMODAL AI SUITE</span>
          <h2 style={{ fontSize: "2.8rem", margin: "15px 0 10px 0", fontWeight: "800", letterSpacing: "-0.5px", background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Cognitive Sentiment & Emotion Intelligence
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.15rem", maxW: "800px", margin: "0 auto", lineHeight: "1.6" }}>
            An advanced platform using custom-trained deep learning models to extract semantic and facial emotion matrices. Stream webcam feeds, upload videos, process high-res photos, or analyze articles instantly.
          </p>
        </div>
      </section>

      {/* Grid of Portals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px" }}>
        
        {/* Text Card */}
        <Link to="/text" className="portal-card text-portal">
          <div className="portal-icon">✍️</div>
          <h3 className="portal-title">Text Sentiment Portal</h3>
          <p className="portal-desc">
            Leverage a custom fine-tuned BERT + BiLSTM Keras model to classify text inputs into 7 distinct emotional probabilities with deep semantic mapping.
          </p>
          <span className="portal-action">Initialize Pipeline &rarr;</span>
        </Link>

        {/* Image Card */}
        <Link to="/image" className="portal-card image-portal">
          <div className="portal-icon">🖼️</div>
          <h3 className="portal-title">Image Emotion Studio</h3>
          <p className="portal-desc">
            Locate face coordinates in static images using OpenCV Haar Cascade and classify expressions with custom YOLOv8 classification weights.
          </p>
          <span className="portal-action">Initialize Pipeline &rarr;</span>
        </Link>

        {/* Webcam Card */}
        <Link to="/webcam" className="portal-card webcam-portal">
          <div className="portal-icon">📹</div>
          <h3 className="portal-title">Live Webcam Arena</h3>
          <p className="portal-desc">
            Initiate a low-latency WebSockets connection to stream camera frames, detecting and overlaying expression bounding boxes at 30fps.
          </p>
          <span className="portal-action">Initialize Pipeline &rarr;</span>
        </Link>

        {/* Video Card */}
        <Link to="/video" className="portal-card video-portal">
          <div className="portal-icon">🎬</div>
          <h3 className="portal-title">Video Timeline Lab</h3>
          <p className="portal-desc">
            Process video files asynchronously through background workers, compiling frame classifications into a scrolling emotion timeline.
          </p>
          <span className="portal-action">Initialize Pipeline &rarr;</span>
        </Link>

      </div>

      {/* Models Status Board */}
      <section className="cyber-card" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", fontWeight: "700", color: "#cbd5e1" }}>🧠 Neural Model Status Center</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
          
          <div className="status-item">
            <span className="status-dot green"></span>
            <div>
              <div className="status-label">NLP Sentiment Classifier</div>
              <div className="status-value">BERT-BiLSTM Hybrid (Loaded)</div>
            </div>
          </div>

          <div className="status-item">
            <span className="status-dot green"></span>
            <div>
              <div className="status-label">CV Expression Classifier</div>
              <div className="status-value">YOLOv8-Nano Custom (Loaded)</div>
            </div>
          </div>

          <div className="status-item">
            <span className="status-dot green"></span>
            <div>
              <div className="status-label">CV Face Detector</div>
              <div className="status-value">Haar Cascade Frontal (Online)</div>
            </div>
          </div>

          <div className="status-item">
            <span className="status-dot green"></span>
            <div>
              <div className="status-label">FastAPI Engine</div>
              <div className="status-value">Active Port 8000 (Online)</div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

export default Dashboard;
