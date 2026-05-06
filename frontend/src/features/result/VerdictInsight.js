import React, { useState, useEffect, useRef } from 'react';
import "../../css/result/VerdictInsight.css";

export default function VerdictInsight({ data }) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  // ✅ 질문 횟수 추적을 위한 상태 추가
  const [questionCount, setQuestionCount] = useState(0);
  const chatWindowRef = useRef(null);

  // 1. 데이터 로드 시 초기 세팅
  useEffect(() => {
    if (data && data.llm_report) {
      setChat([{ type: 'ai', text: data.llm_report }]);
    } else {
      setChat([{ type: 'ai', text: "LIME 분석을 토대로 이 영상의 위조 가능성에 대해 궁금한 점을 물어보세요." }]);
    }
    // 새로운 영상 분석 시 횟수 초기화 (필요 시)
    setQuestionCount(0);
  }, [data]);

  // 2. 자동 스크롤
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chat]);

  // 3. 메시지 전송 함수
  const sendMsg = async (e) => {
    e.preventDefault();
    
    // ✅ 3번 제한 체크
    if (!input || isTyping || questionCount >= 3) return;

    const userMessage = input;
    setInput("");
    
    const newChat = [...chat, { type: 'user', text: userMessage }];
    setChat(newChat);
    setIsTyping(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          context: data,           // 이전 분석 데이터
          lime_url: data.lime_url  // ✅ Gemini가 사진을 볼 수 있도록 URL 전달!
        }),
      });

      if (!response.ok) throw new Error("서버 응답 오류");

      const resData = await response.json();

      setChat((prev) => [...prev, { type: 'ai', text: resData.reply }]);
      
      // ✅ 질문 성공 시 횟수 증가
      setQuestionCount(prev => prev + 1);

    } catch (error) {
      console.error("챗봇 에러:", error);
      setChat((prev) => [...prev, { type: 'ai', text: "죄송합니다. 답변을 가져오는 중 오류가 발생했습니다." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!data || !data.result) return null;

  const isFake = data.result === "FAKE";
  const verdictColor = isFake ? "#FF4D4D" : "#00FFC8";
  const rawScore = (data.final_score || 0) * 100;
  const displayScore = isFake ? rawScore : (100 - rawScore);

  // ✅ 질문 가능 여부 계산
  const isLimitReached = questionCount >= 3;

  return (
    <section className="VerdictInsight">
      <div className="verdict-summary">
        <div className="main-verdict-area" style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
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
          
          {/* ✅ 시스템 아키텍처 및 질문 기회 설명 영역 */}
          <div style={{ marginTop: '8px', fontSize: '0.8rem', lineHeight: '1.4' }}>
            <div style={{ opacity: 0.5 }}>
              • <strong>판정 엔진:</strong> EfficientNet-B0 기반 정밀 분석 수행
            </div>
            <div style={{ opacity: 0.5 }}>
              • <strong>시각적 검증:</strong> MesoNet 기반 LIME 피처 교차 검증 적용
            </div>
            
            {/* ✅ 질문 기회 (디자인 가독성을 위해 별도 줄 또는 강조된 스타일로 배치) */}
            <div style={{ 
              marginTop: '6px', 
              color: isLimitReached ? '#FF4D4D' : '#00FFC8', 
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              ● 질문 기회: {3 - questionCount} / 3 남아있음
            </div>
          </div>
        </div>
      </div>

      <div className="llm-chat-section">
        <div className="chat-window" ref={chatWindowRef}>
          {chat.map((m, i) => (
            <div key={i} className={`bubble ${m.type}`}>
              {m.text}
            </div>
          ))}
          {isTyping && <div className="bubble ai typing">답변을 생각 중입니다...</div>}
          {isLimitReached && <div className="bubble ai" style={{ opacity: 0.5 }}>🚫 질문 횟수(3회)를 모두 사용하였습니다.</div>}
        </div>
        
        {/* ✅ 질문 횟수가 초과되면 input과 button을 비활성화(disabled) */}
        <form onSubmit={sendMsg} className="input-group" style={{ opacity: isLimitReached ? 0.5 : 1 }}>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={
              isLimitReached 
                ? "질문 횟수 초과" 
                : isTyping ? "AI가 응답 중입니다..." : "AI에게 질문하기..."
            } 
            autoComplete="off"
            disabled={isTyping || isLimitReached}
          />
          <button type="submit" disabled={isTyping || isLimitReached}>Ask</button>
        </form>
      </div>
    </section>
  );
}