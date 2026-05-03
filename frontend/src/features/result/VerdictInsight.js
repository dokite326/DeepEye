import React, { useState } from 'react';
import "../../css/result/VerdictInsight.css";

export default function VerdictInsight({ data }) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([
    { type: 'ai', text: "LIME 분석을 토대로 이 영상의 위조 가능성에 대해 궁금한 점을 물어보세요." }
  ]);

  const sendMsg = (e) => {
    e.preventDefault();
    if (!input) return;
    setChat([...chat, { type: 'user', text: input }]);
    // 여기에 나중에 LLM 연동 로직 추가
    setInput("");
  };

  return (
    <section className="VerdictInsight">
      <div className="verdict-summary">
        <div className={`status-text ${data?.result}`}>
          {data?.result} DETECTED
        </div>
        <div className="stats-row">
          <div className="stat-item">
            <span>Overall Score</span>
            <strong>{(data?.final_score * 100).toFixed(1)}%</strong>
          </div>
          <div className="stat-item">
            <span>Ensemble Ratio</span>
            <small>Eff-B0 (0.7) : Meso (0.3)</small>
          </div>
        </div>
      </div>

      <div className="llm-chat-section">
        <div className="chat-window">
          {chat.map((m, i) => <div key={i} className={`bubble ${m.type}`}>{m.text}</div>)}
        </div>
        <form onSubmit={sendMsg} className="input-group">
          <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="AI에게 질문하기..." />
          <button type="submit">Ask</button>
        </form>
      </div>
    </section>
  );
}