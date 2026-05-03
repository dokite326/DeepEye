import React from 'react';
import "../../css/result/LimeVisualizer.css";

export default function LimeVisualizer({ data }) {
  return (
    <section className="LimeVisualizer">
      <div className="section-title">
        <span className="badge">LIME XAI Analysis</span>
        <h2>Visual Interpretation Map</h2>
      </div>
      <div className="visual-layout">
        <div className="media-box">
          {/* 백엔드에서 생성된 LIME 이미지를 띄울 자리 */}
          <div className="placeholder">LIME Heatmap Preview</div>
        </div>
        <div className="explanation-box">
          <p>
            <strong>LIME(Local Interpretable Model-agnostic Explanations)</strong> 분석 결과, 
            얼굴 경계면의 픽셀 전이 오차가 모델 판정에 가장 결정적인 기여를 했습니다.
            붉은색 활성화 영역은 AI가 합성의 증거로 판단한 핵심 구간입니다.
          </p>
        </div>
      </div>
    </section>
  );
}