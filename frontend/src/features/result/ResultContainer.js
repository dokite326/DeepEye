import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LimeVisualizer from './LimeVisualizer';
import VerdictInsight from './VerdictInsight';
import Footer from '../../components/Layout/Footer'; 

import "../../css/result/ResultContainer.css";

export default function ResultContainer() {
    const location = useLocation();
    const navigate = useNavigate();
    // ✅ HeroSection에서 navigate("/result", { state: response.data })로 보냈으므로 
    // location.state가 곧 백엔드 응답 데이터입니다.
    const data = location.state;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (!data) {
            const timer = setTimeout(() => {
                navigate('/');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [data, navigate]);

    if (!data) {
        return (
            <div className="loading-state">
                <div className="loader-box">
                    <p>분석 데이터를 찾을 수 없습니다.</p>
                    <span>잠시 후 메인 화면으로 이동합니다...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="PageWrapper">
            <div className="ResultContainer">
                {/* 🎥 왼쪽 영역: LIME 히트맵 */}
                <div className="left-section">
                    <LimeVisualizer data={data} />
                </div>

                {/* 💬 오른쪽 영역: 상세 판정 결과 */}
                <div className="right-section">
                    <VerdictInsight data={data} />
                </div>
            </div>
            <Footer />
        </div>
    );
}