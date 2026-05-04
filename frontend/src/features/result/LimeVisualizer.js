import React from 'react';
import "../../css/result/LimeVisualizer.css";

export default function LimeVisualizer({ data }) {
    // ✅ 백엔드에서 보내주는 필드명 'lime_url'을 우선적으로 참조
    const limeImageUrl = data?.lime_url;

    return (
        <section className="LimeVisualizer">
            <div className="section-title">
                <span className="badge">LIME XAI Analysis</span>
                <h2>Visual Interpretation Map</h2>
            </div>
            
            <div className="visual-layout">
                <div className="media-box">
                    {limeImageUrl ? (
                        <img 
                            src={limeImageUrl} 
                            alt="LIME Heatmap Analysis" 
                            className="analysis-image"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '<div class="error-text">이미지를 불러올 수 없습니다.</div>';
                            }}
                        />
                    ) : (
                        <div className="placeholder-container">
                            <div className="spinner"></div>
                            <p>LIME Heatmap Generating...</p>
                        </div>
                    )}
                </div>

                <div className="explanation-box">
                    <p>
                        <span className="accent-text">Analysis Report:</span><br />
                        <strong>LIME(Local Interpretable Model-agnostic Explanations)</strong> 분석 결과, 
                        데이터 기반 특징 추출 영역이 모델 판정에 가장 결정적인 기여를 했습니다.
                        노란색(Eff), 주황색(Meso) 영역은 각 모델의 판단 근거이며, <span style={{color:'#FF4D4D', fontWeight:'bold'}}>빨간색</span> 영역은 두 모델이 공통적으로 위조 가능성을 지목한 핵심 구간입니다.
                    </p>
                </div>
            </div>
        </section>
    );
}