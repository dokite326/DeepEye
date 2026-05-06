import React from 'react';
import "../../css/result/LimeVisualizer.css";

export default function LimeVisualizer({ data }) {
    const limeImageUrl = data?.lime_url;
    const result = data?.result; // 'FAKE' 또는 'REAL'
    const isDiscrepancy = data?.is_discrepancy; // 모델 간 의견 불일치 여부

    // ✅ 가독성을 높인 상황별 맞춤 리포트 생성 로직
    const getReportContent = () => {
        // 1. 모델 간 의견이 불일치할 경우 (EfficientNet 결과 위주 설명)
        if (isDiscrepancy) {
            return (
                <>
                    주 분석 엔진(EfficientNet)이 포착한 특정 영역의 데이터 왜곡이 판정의 결정적 근거가 되었습니다. 
                    <span style={{ color: '#FFD700', fontWeight: 'bold' }}> 노란색</span> 구간은 모델이 집중 분석한 핵심 영역이며, 
                    보조 모델과의 판단 불일치로 인해 주 모델의 신뢰 구간만을 단독으로 표시합니다.
                </>
            );
        }

        // 2. 두 모델의 의견이 일치하는 FAKE일 경우
        if (result === "FAKE") {
            return (
                <>
                    시각화된 이미지 내 부자연스러운 패턴이 위조 판정의 핵심 증거로 포착되었습니다. 
                    노란색(Eff)과 주황색(Meso)은 각 모델의 개별 의심 구역이며, 
                    <span style={{ color: '#FF4D4D', fontWeight: 'bold' }}> 빨간색</span> 영역은 두 모델이 공통적으로 조작 가능성이 매우 높다고 판단한 고위험 구간입니다.
                </>
            );
        }

        // 3. 두 모델의 의견이 일치하는 REAL일 경우
        return (
            <>
                이미지 전반에서 인위적인 변조 흔적이 없는 자연스러운 특징들이 확인되었습니다. 
                노란색(Eff)과 주황색(Meso)은 데이터 무결성이 확인된 지점이며, 
                <span style={{ color: '#FF4D4D', fontWeight: 'bold' }}> 빨간색</span> 영역은 두 모델이 공통적으로 실제 촬영된 데이터임을 확신하는 신뢰 구간입니다.
            </>
        );
    };

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
                        {/* ✅ 중복 문구를 제거하고 가독성을 위해 불필요한 strong 태그 정리 */}
                        {getReportContent()}
                    </p>
                </div>
            </div>
        </section>
    );
}