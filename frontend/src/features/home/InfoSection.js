import React from 'react';
import { motion } from 'framer-motion';
import "../../css/home/InfoSection.css";
import infoBg from "../../assets/info-bg.png";

export default function InfoSection() {
  const infoData = [
    {
      icon: "🔬",
      title: "Ensemble Architecture",
      desc: "Analyzes artifacts via <strong>EfficientNet-B0 & MesoNet</strong> ensemble models for robust detection."
    },
    {
      icon: "⚡",
      title: "Optimized Pipeline",
      desc: "Fast processing through our <strong>Python-based FastAPI backend</strong>, delivering results in seconds."
    },
    {
      icon: "🧠",
      title: "Interpretable AI",
      desc: "Uses <strong>Grad-CAM heatmaps</strong> to visualize specific areas of deepfake manipulation."
    }
  ];

  return (
    <section 
      className="InfoSection" 
      style={{ backgroundImage: `url(${infoBg})` }}
    >
      <div className="Bottom-inner">
        <motion.div 
          className="info-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* 배지 내용 구체화 */}
          <span className="info-badge">INTELLIGENT VISION ANALYTICS v1.0</span>
          <h2>Hybrid Detection Engine</h2>
          <p className="header-desc">
            DeepEye uses advanced deep learning to ensure digital integrity.
          </p>
        </motion.div>

        <div className="card-container">
          {infoData.map((item, index) => (
            <motion.div 
              key={index}
              className="info-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }} // 호버 효과 추가
            >
              <div className="card-top">
                <span className="card-icon">{item.icon}</span>
                <span className="card-no">0{index + 1}</span>
              </div>
              <h3>{item.title}</h3>
              <p dangerouslySetInnerHTML={{ __html: item.desc }} />
              
              {/* 푸터 부분에 시스템 안정성 느낌의 텍스트 추가 */}
              <div className="card-footer">
                <span className="status-dot"></span>
                SYSTEM STATUS: <span className="status-text">OPERATIONAL</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}