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
    setInput("");
  };

  // ✅ 데이터가 없으면 렌더링 방지
  if (!data || !data.result) return null;

  const isFake = data.result === "FAKE";
  const verdictColor = isFake ? "#FF4D4D" : "#00FFC8";

  // ✅ 백엔드 가중치 반영 점수 계산
  const rawScore = (data.final_score || 0) * 100;
  const displayScore = isFake ? rawScore : (100 - rawScore);

  return (
    <section className="VerdictInsight">
      <div className="verdict-summary">
        <div className="main-verdict-area" style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          {/* ✅ 불필요한 기본값 제거, 확실한 데이터만 출력 */}
          <h2 style={{ color: verdictColor, fontWeight: "900", fontSize: "3rem", margin: 0 }}>
            {data.result}
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="main-score" style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>
              {displayScore.toFixed(1)}%
            </span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '400' }}>
              (신뢰도)
            </span>
          </div>
        </div>

        <div className="ensemble-info">
          AI가 {displayScore.toFixed(1)}%의 신뢰도로 이 미디어를 <strong>{data.result}</strong>이라 판정했습니다.
          <div style={{ opacity: 0.4, marginTop: '4px', fontSize: '0.8rem' }}>
            Ensemble: EfficientNet-B0 (0.8) + MesoNet (0.2)
          </div>
        </div>
      </div>

      <div className="llm-chat-section">
        <div className="chat-window">
          {chat.map((m, i) => (
            <div key={i} className={`bubble ${m.type}`}>
              {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={sendMsg} className="input-group">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="AI에게 질문하기..." 
            autoComplete="off"
          />
          <button type="submit">Ask</button>
        </form>
      </div>
    </section>
  );
}