import React, { useEffect } from 'react';
import HeroSection from '../features/home/HeroSection';
import InfoSection from '../features/home/InfoSection';
import GallerySection from '../features/home/GallerySection';

export default function HomePage() {
  // 페이지 진입 시 최상단으로 스크롤 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="HomePage">
      {/* 1섹션: 메인 히어로 & 업로드 영역 */}
      <section id="hero">
        <HeroSection />
      </section>

      {/* 2섹션: 기술 스택 및 서비스 특징 (Ensemble, FastAPI, XAI) */}
      <section id="info">
        <InfoSection />
      </section>

      {/* 3섹션: 실제 탐지 사례 갤러리 (Deepfake Samples) */}
      <section id="gallery">
        <GallerySection />
      </section>

      {/* 선택 사항: 페이지가 길어질 경우를 대비한 상단 이동 버튼 등 추가 가능 */}
    </main>
  );
}