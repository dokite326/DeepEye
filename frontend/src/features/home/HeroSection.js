import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom"; 

// 스타일 및 자산
import "../../css/home/HeroSection.css"; 
import bg from "../../assets/bg.png";

export default function HeroSection() {
  const canvasRef = useRef(null);
  const navigate = useNavigate(); 
  const animRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [snsLink, setSnsLink] = useState("");
  const [isLongVideo, setIsLongVideo] = useState(false);
  const [trimRange, setTrimRange] = useState({ start: "00:00", end: "03:00" });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, y, w, 2);
      }
      if (frame % 20 === 0) {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(0,255,200,${Math.random() * 0.06})`;
          ctx.fillRect(
            Math.random() * w, Math.random() * h,
            Math.random() * 200 + 50, Math.random() * 5
          );
        }
      }
      frame++;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isImage) {
      setFileName(file.name);
      moveToResult("image", file);
    } else if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 180) {
          alert("⚠️ 업로드 실패: 3분을 초과하는 영상은 분석할 수 없습니다.");
          setFileName("");
        } else {
          setFileName(file.name);
          moveToResult("video", file);
        }
      };
      video.src = URL.createObjectURL(file);
    } else {
      alert("이미지 또는 영상 파일만 업로드 가능합니다.");
    }
  };

  const moveToResult = (type, fileData) => {
    navigate("/result", { 
      state: { 
        type: type, 
        file: fileData, 
        name: fileData.name 
      } 
    });
  };

  const handleLinkChange = (e) => {
    const url = e.target.value;
    setSnsLink(url);
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.length > 30) {
      setIsLongVideo(true);
    } else {
      setIsLongVideo(false);
    }
  };

  const handleSnsSubmit = () => {
    if (!snsLink) {
      alert("Please paste a valid link.");
      return;
    }
    if (isLongVideo && (!trimRange.start || !trimRange.end)) {
      alert("분석할 구간을 설정해주세요.");
      return;
    }
    navigate("/result", { 
      state: { 
        type: "link", 
        url: snsLink,
        isTrimmed: isLongVideo,
        range: isLongVideo ? trimRange : { start: "00:00", end: "03:00" }
      } 
    });
  };

  return (
    <section
      className="HeroSection"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundColor: "#8ebebb",
      }}
    >
      <canvas ref={canvasRef} className="glitch-canvas" />

      {/* ✅ 중요 1: .contents 클래스는 디자인 유지에 필수입니다. 그대로 두세요! */}
      <div className="contents">
        <motion.div
          className="top-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="badge">DeepEye v1.0</div>
          <h1 className="glitch-title" data-text="Real or Fake?">Real or Fake?</h1>
          <p className="subtitle">
            Upload images or videos — our AI detects deepfakes and{" "}
            <span className="accent">explains why</span>.
          </p>
        </motion.div>

        {/* ✅ 중요 2: 클래스명에 'expanded'가 붙어야 긴 영상 설정 UI가 예쁘게 나옵니다. */}
        <motion.div
          className={`upload-box split ${dragOver ? "drag-active" : ""} ${isLongVideo ? "expanded" : ""}`}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="split-left">
            <label className="upload-label" htmlFor="video-upload">
              <div className="icon-wrap">📁</div>
              <span className="upload-text">
                {fileName ? fileName : "Image & Video"}
              </span>
              <p className="upload-hint">Up to 3min for video</p>
            </label>
            <input
              id="video-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              hidden
            />
          </div>

          <div className="vertical-divider"><span>OR</span></div>

          <div className="split-right">
            <div className="icon-wrap">🔗</div>
            <span className="link-title">Analyze SNS Link</span>
            
            <div className="link-input-group">
              <input 
                type="text" 
                placeholder="Paste link here..." 
                className="sns-link-input"
                value={snsLink}
                onChange={handleLinkChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSnsSubmit()}
              />
              <button className="link-submit-btn" onClick={handleSnsSubmit}>Go</button>
            </div>

            <AnimatePresence>
              {isLongVideo && (
                <motion.div 
                  className="trim-settings"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="trim-notice">⚠️ Long video: Set analysis range (Max 3min)</p>
                  <div className="trim-inputs">
                    {/* ✅ 중요 3: CSS의 .input-with-unit 구조와 맞게 input-field 클래스 수정 */}
                    <div className="input-field">
                      <label>Start (mm:ss)</label>
                      <div className="input-with-unit">
                        <input 
                          type="text" 
                          value={trimRange.start} 
                          onChange={(e) => setTrimRange({...trimRange, start: e.target.value})}
                          placeholder="00:00"
                        />
                        <span className="unit-label">min</span>
                      </div>
                    </div>
                    <div className="input-field">
                      <label>End (mm:ss)</label>
                      <div className="input-with-unit">
                        <input 
                          type="text" 
                          value={trimRange.end} 
                          onChange={(e) => setTrimRange({...trimRange, end: e.target.value})}
                          placeholder="03:00"
                        />
                        <span className="unit-label">min</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="scroll-indicator">↓ SCROLL</div>
      </div>      
    </section>
  );
}