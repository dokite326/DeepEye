import { Link } from 'react-router-dom';
import '../../css/layout/Header.css';

export default function Header() {
  return (
    // 1. className="Header"를 제거하거나 CSS의 header 선택자와 맞춥니다.
    // 2. 불필요한 중첩 div(header-inner, header-nav)를 모두 제거합니다.
    <header>
      {/* 3. header의 직계 자식으로 #logo와 #git이 와야 CSS의 space-between이 작동합니다. */}
      <div id="logo">
        <Link to="/">👁 DeepEye</Link>
      </div>

      <div id="git">
        <a 
          href="https://github.com/dokite326/DeepEye/tree/main" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}