import axios from "axios";
import { useAuthStore } from "./store";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL + import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/";
    }
    return Promise.reject(err.response?.data?.error || err.message || "Something went wrong");
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  guest: (data) => api.post("/auth/guest", data),
  me: () => api.get("/auth/me"),
};

// Rooms
export const roomAPI = {
  list: () => api.get("/rooms"),
  create: (settings) => api.post("/rooms", { settings }),
  get: (code) => api.get(`/rooms/${code}`),
};

// Leaderboard
export const leaderAPI = {
  global: (params) => api.get("/leaderboard", { params }),
  me: () => api.get("/leaderboard/me"),
};

// Users
export const userAPI = {
  get: (username) => api.get(`/users/${username}`),
  update: (data) => api.patch("/users/me", data),
};

// Health check
export const healthAPI = {
  check: () => api.get("/health"),
};

export default api;
