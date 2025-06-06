// src/api/api.js
import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // or from context if needed
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth routes
export const googleLogin = () => {
  window.location.href = `${api.defaults.baseURL.replace("/api", "")}/auth/google`;
};

export const fetchUserProfile = () => api.get("/users/me");
export const fetchHistory = () => api.get("/users/me/history");
export const fetchFriends = () => api.get("/users/friends");
export const addFriend = (friendId) => api.post("/users/friends", { friendId });

// Room/Game routes
export const createRoom = () => api.post("/game/create");
export const joinRoom = (code) => api.post("/game/join", { code });
export const listRooms = () => api.get("/game/list");

export default api;
