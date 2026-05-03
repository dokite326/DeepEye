import React from 'react';
import { useLocation } from 'react-router-dom';
import LimeVisualizer from './LimeVisualizer';
import VerdictInsight from './VerdictInsight';
// ✅ 도연님이 알려주신 정확한 경로로 수정 완료!
import Footer from '../../components/Layout/Footer'; 

import "../../css/result/ResultContainer.css";

export default function ResultContainer() {
    const location = useLocation();
    const data = location.state;

    // 데이터가 없을 때의 예외 처리
    if (!data) {
        return (
            <div className="loading-state">
                분석 데이터를 불러오는 중입니다...
            </div>
        );
    }

    return (
        <div className="PageWrapper">
            <div className="ResultContainer">
                {/* 🎥 왼쪽 영역: LIME 이미지 + 설명 + 판정 결과 (Sticky 고정) */}
                <div className="left-section">
                    <LimeVisualizer data={data} />
                </div>

                {/* 💬 오른쪽 영역: LLM 챗봇 전용 (전체 스크롤 가능) */}
                <div className="right-section">
                    <VerdictInsight data={data} />
                </div>
            </div>
            
        </div>
    );
}