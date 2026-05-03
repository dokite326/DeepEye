import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 전역 스타일
import "./css/global.css";
import './App.css';

// 공통 레이아웃
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// 페이지 단위 컴포넌트
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage'; // 새로 만든 폴더 구조에 맞춰 준비

function App() {
  return (
    <Router>
      <div className="App">
        {/* 모든 페이지에서 공통으로 보이는 헤더 */}
        <Header />

        {/* 페이지 전환 영역 */}
        <main>
          <Routes>
            {/* 메인 홈 화면 (기존 Top, Bottom이 합쳐진 곳) */}
            <Route path="/" element={<HomePage />} />
            
            {/* AI 분석 결과 화면 */}
            <Route path="/result" element={<ResultPage />} />
          </Routes>
        </main>

        {/* 모든 페이지에서 공통으로 보이는 푸터 */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;