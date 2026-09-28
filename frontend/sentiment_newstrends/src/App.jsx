import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import TextAnalyzer from "./components/TextAnalyzer";
import ImageAnalyzer from "./components/ImageAnalyzer";
import WebcamAnalyzer from "./components/WebcamAnalyzer";
import VideoAnalyzer from "./components/VideoAnalyzer";

function App() {
  return (
    <Router>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" }}>
        
        {/* Floating Glassmorphic Header */}
        <header style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "40px",
          padding: "20px 30px",
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        }}>
          <div>
            <h1 className="logo-glow" style={{ fontSize: "1.8rem", margin: 0, fontWeight: "800", letterSpacing: "-1px" }}>
              AURA SENTIMENT
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "0.85rem", fontWeight: "500", textTransform: "uppercase", letterSpacing: "1px" }}>
              Multimodal AI NLP & CV Intelligence
            </p>
          </div>
          
          <div className="connection-badge">
            <span className="badge-dot animate-pulse"></span>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", tracking: "0.5px" }}>ENGINE: ACTIVE</span>
          </div>
        </header>

        {/* Navigation Dock */}
        <nav className="cyber-nav">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => `cyber-nav-link ${isActive ? "active" : ""}`}
          >
            🎛️ Control Hub
          </NavLink>
          <NavLink 
            to="/text" 
            className={({ isActive }) => `cyber-nav-link ${isActive ? "active" : ""}`}
          >
            ✍️ Text Portal
          </NavLink>
          <NavLink 
            to="/image" 
            className={({ isActive }) => `cyber-nav-link ${isActive ? "active" : ""}`}
          >
            🖼️ Image Studio
          </NavLink>
          <NavLink 
            to="/webcam" 
            className={({ isActive }) => `cyber-nav-link ${isActive ? "active" : ""}`}
          >
            📹 Live Webcam
          </NavLink>
          <NavLink 
            to="/video" 
            className={({ isActive }) => `cyber-nav-link ${isActive ? "active" : ""}`}
          >
            🎬 Video Lab
          </NavLink>
        </nav>

        {/* Main Workspace */}
        <main style={{ marginTop: "30px" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/text" element={<TextAnalyzer />} />
            <Route path="/image" element={<ImageAnalyzer />} />
            <Route path="/webcam" element={<WebcamAnalyzer />} />
            <Route path="/video" element={<VideoAnalyzer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
