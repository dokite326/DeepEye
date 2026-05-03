import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });

export const predictImage = (formData) => API.post('/predict', formData);
// 나중에 영상/링크용 API도 여기에 추가할 거예요.