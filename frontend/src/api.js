import axios from 'axios';

// ✅ 백엔드 서버 주소 (CORS 에러 방지를 위해 127.0.0.1로 통일)
const API = axios.create({ 
  baseURL: 'http://127.0.0.1:8000',
});

/**
 * 1. 로컬 이미지/영상 파일 분석 API
 * @param {FormData} formData - file 필드를 포함한 폼 데이터
 */
export const predictImage = (formData) => {
  return API.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * 2. ✅ SNS 링크(URL) 분석 API
 * @param {Object} data - { url: "...", isTrimmed: boolean, range: {...} }
 */
export const predictLink = (data) => {
  return API.post('/predict-link', data, {
    headers: { 'Content-Type': 'application/json' }
  });
};

export default API;