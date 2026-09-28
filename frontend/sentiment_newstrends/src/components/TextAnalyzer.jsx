import { useState } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const emojiMap = {
  joy: "🥳 Joy",
  love: "💖 Love",
  anger: "🔥 Anger",
  sadness: "🌧️ Sadness",
  fear: "👻 Fear",
  surprise: "⚡ Surprise",
  neutral: "✨ Neutral"
};

const colors = {
  joy: "linear-gradient(90deg, #eab308, #f59e0b)",
  love: "linear-gradient(90deg, #ec4899, #f43f5e)",
  anger: "linear-gradient(90deg, #ef4444, #dc2626)",
  sadness: "linear-gradient(90deg, #3b82f6, #2563eb)",
  fear: "linear-gradient(90deg, #a855f7, #7c3aed)",
  surprise: "linear-gradient(90deg, #06b6d4, #0891b2)",
  neutral: "linear-gradient(90deg, #94a3b8, #64748b)"
};

function TextAnalyzer() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/predict/text`, { text });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during analysis.");
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div className="cyber-card" style={{ maxWidth: "850px", margin: "0 auto" }}>
      <h2 className="cyber-title" style={{ margin: "0 0 10px 0", background: "linear-gradient(135deg, #a855f7 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        ✍️ Text Sentiment Engine
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 20px 0" }}>
        Input any article extract, feedback statement, or sentence. The system will pre-process, tokenize, and feed the vector to our custom BERT + BiLSTM Keras classifier.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or write your text here (e.g., 'I am so excited for this project to start! It has been my dream.')"
          rows={5}
          className="cyber-input"
          style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
        />

        <button 
          onClick={analyzeText} 
          disabled={loading || !text.trim()} 
          className="btn-primary"
          style={{ alignSelf: "flex-end", minWidth: "180px" }}
        >
          {loading ? "Processing Vectors..." : "Scan Semantics"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: "20px", padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444", fontSize: "0.9rem" }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "30px", display: "grid", gridTemplateColumns: "1fr", gap: "25px" }}>
          <hr style={{ border: "0", borderTop: "1px solid rgba(255,255,255,0.06)", margin: 0 }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {/* Summary details */}
            <div className="cyber-card" style={{ flex: "1", minWidth: "260px", background: "rgba(168, 85, 247, 0.02)", border: "1px solid rgba(168, 85, 247, 0.1)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "15px", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.3))" }}>
                {emojiMap[result.emotion]?.split(" ")[0] || "✨"}
              </div>
              <h4 style={{ margin: "0 0 10px 0", color: "#94a3b8", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>Dominant Emotion</h4>
              <strong style={{ color: "#cbd5e1", fontSize: "1.6rem", textTransform: "capitalize" }}>
                {result.emotion}
              </strong>
              
              <div style={{ marginTop: "15px", display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Confidence:</span>
                <strong style={{ color: "#ffffff", fontSize: "1.1rem" }}>{result.confidence.toFixed(1)}%</strong>
              </div>

              <div style={{ marginTop: "15px" }}>
                <span style={{ 
                  padding: "4px 12px", 
                  borderRadius: "30px", 
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  background: result.sentiment === "positive" ? "rgba(16, 185, 129, 0.1)" : result.sentiment === "negative" ? "rgba(239, 68, 68, 0.1)" : "rgba(148, 163, 184, 0.1)",
                  color: result.sentiment === "positive" ? "#10b981" : result.sentiment === "negative" ? "#ef4444" : "#94a3b8",
                  border: result.sentiment === "positive" ? "1px solid rgba(16, 185, 129, 0.2)" : result.sentiment === "negative" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(148, 163, 184, 0.2)"
                }}>
                  {result.sentiment.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Probability Breakdown */}
            <div className="cyber-card" style={{ flex: "1.4", minWidth: "300px", background: "rgba(255,255,255,0.01)" }}>
              <h4 style={{ margin: "0 0 20px 0", color: "#cbd5e1", fontSize: "1rem", fontWeight: "700" }}>Semantic Probability Map</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.entries(result.probabilities).map(([emotionName, prob]) => (
                  <div key={emotionName}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                      <span style={{ textTransform: "capitalize", color: "#cbd5e1", fontWeight: "500" }}>
                        {emotionName === result.emotion ? `👉 ${emotionName}` : emotionName}
                      </span>
                      <span style={{ color: emotionName === result.emotion ? "#ffffff" : "#64748b", fontWeight: "700" }}>
                        {prob.toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress-bar-container" style={{ height: "8px" }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${prob}%`,
                          background: colors[emotionName] || colors.neutral
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextAnalyzer;
