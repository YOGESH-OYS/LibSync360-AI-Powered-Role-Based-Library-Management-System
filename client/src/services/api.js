import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  //http://IPv4:5000/api
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let onSessionExpired = null;

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message?.toLowerCase() || "";
    if (
      error.response?.status === 401 &&
      (msg.includes("session expired") || msg.includes("access token required"))
    ) {
      if (onSessionExpired) {
        onSessionExpired();
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  me: () => api.get("/auth/me"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) =>
    api.post("/auth/reset-password", { token, newPassword }),
};

// Users API
export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (profileData) => api.put("/users/profile", profileData),
  changePassword: (passwordData) =>
    api.put("/users/change-password", passwordData),
  getAll: (params) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  getStatistics: (id) => api.get(`/users/${id}/statistics`),
  create: (userData) => api.post("/users", userData),
  verifyPassword: (password) =>
    api.post("/users/verify-password", { password }),
};

// Books API
export const booksAPI = {
  getAll: (params) => api.get("/books", { params }),
  getById: (id) => api.get(`/books/${id}`),
  create: (bookData) => api.post("/books", bookData),
  update: (id, bookData) => api.put(`/books/${id}`, bookData),
  delete: (id) => api.delete(`/books/${id}`),
  search: (query, filters) =>
    api.get("/books/search", { params: { query, filters } }),
  getPopular: (limit) => api.get("/books/popular", { params: { limit } }),
  getRecent: (limit) => api.get("/books/recent", { params: { limit } }),
  getRecommendations: (limit) =>
    api.get("/books/recommendations", { params: { limit } }),
  updateAvailability: (id, change) =>
    api.put(`/books/${id}/availability`, { change }),
};

// Borrowings API
export const borrowingsAPI = {
  getAll: (params) => api.get("/borrowings", { params }),
  getById: (id) => api.get(`/borrowings/${id}`),
  getMyBorrowings: (params) => api.get("/borrowings/my-borrowings", { params }),
  lend: (borrowingData) => api.post("/borrowings/lend", borrowingData),
  return: (id) => api.put(`/borrowings/${id}/return`),
  extend: (id, days) => api.put(`/borrowings/${id}/extend`, { days }),
  markLost: (id) => api.put(`/borrowings/${id}/lost`),
  getHistory: (params) => api.get("/borrowings/history", { params }),
  getOverdue: (params) => api.get("/borrowings/overdue", { params }),
};

// Fines API
export const finesAPI = {
  getAll: (params) => api.get("/fines", { params }),
  getById: (id) => api.get(`/fines/${id}`),
  getMyFines: (params) => api.get("/fines/my-fines", { params }),
  create: (fineData) => api.post("/fines", fineData),
  updateStatus: (id, status, notes) =>
    api.put(`/fines/${id}/status`, { status, notes }),
  pay: (id, paymentData) => api.post(`/fines/${id}/pay`, paymentData),
  dispute: (id, reason) => api.post(`/fines/${id}/dispute`, { reason }),
  getStatistics: () => api.get("/fines/statistics/overview"),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get("/notifications", { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteRead: () => api.delete("/notifications/read-all"),
  create: (notificationData) => api.post("/notifications", notificationData),
  getAllAdmin: (params) => api.get("/notifications/admin/all", { params }),
  getStatistics: () => api.get("/notifications/admin/statistics"),
  updatePreferences: (preferences) =>
    api.put("/notifications/preferences", preferences),
  broadcastAdmins: (data) => api.post("/notifications/broadcast-admins", data),
  adminBroadcast: (data) => api.post("/notifications/admin/broadcast", data),
  adminDelete: (id) => api.delete(`/notifications/admin/${id}`),
  adminDeleteForAll: (data) =>
    api.delete("/notifications/admin/delete-for-all", { data }),
};

// Reviews API
export const reviewsAPI = {
  getByBook: (bookId, params) => api.get(`/reviews/book/${bookId}`, { params }),
  getMyReviews: (params) => api.get("/reviews/my-reviews", { params }),
  getById: (id) => api.get(`/reviews/${id}`),
  create: (reviewData) => api.post("/reviews", reviewData),
  update: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  delete: (id) => api.delete(`/reviews/${id}`),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`),
  getAllAdmin: (params) => api.get("/reviews/admin/all", { params }),
  getStatistics: () => api.get("/reviews/admin/statistics"),
};

// AI API
export const aiAPI = {
  search: (query, limit, filters) =>
    api.get("/ai/search", { params: { query, limit, filters } }),
  getRecommendations: (limit, type) =>
    api.get("/ai/recommendations", { params: { limit, type } }),
  getTrending: (limit, period) =>
    api.get("/ai/trending", { params: { limit, period } }),
  analyzeSentiment: (text) => api.post("/ai/sentiment", { text }),
  predictOverdue: (borrowingId) =>
    api.get(`/ai/predict-overdue/${borrowingId}`),
  getSimilar: (bookId, limit) =>
    api.get(`/ai/similar/${bookId}`, { params: { limit } }),
  generateEmbeddings: (bookId) =>
    api.post("/ai/generate-embeddings", { bookId }),
  getInsights: () => api.get("/ai/insights"),
  getAcademicRecommendations: () => api.get("/ai/academic-recommendations"),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getBooks: (params) => api.get("/admin/books", { params }),
  addBook: (bookData) => api.post("/admin/books", bookData),
  update: (id, bookData) => api.put(`/admin/books/${id}`, bookData),
  deleteBook: (id) => api.delete(`/admin/books/${id}`),
  getBorrowings: (params) => api.get("/admin/borrowings", { params }),
  getFines: (params) => api.get("/admin/fines", { params }),
  confirmFinePayment: (id) => api.put(`/admin/fines/${id}/confirm-payment`),
};

// System API
export const systemAPI = {
  health: () => api.get("/health"),
  stats: () => api.get("/stats"),
  testEmail: () => api.post("/test/email"),
  testAI: () => api.post("/test/ai"),
  triggerCron: (job) => api.post(`/cron/${job}`),
};

export default api;