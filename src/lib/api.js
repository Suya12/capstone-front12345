import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  withCredentials: true,
});

// 🔐 모든 요청에 x-api-key 자동 추가
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["x-api-key"] = import.meta.env.VITE_API_KEY;
  return config;
});
