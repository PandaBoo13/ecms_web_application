// src/services/api/axiosConfig.ts
import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_ENDPOINT } from '@/constants/api-endpoint';

// ══════════════════════════════════════════════════════════════
// EXTEND AXIOS ERROR TYPES
// ══════════════════════════════════════════════════════════════
export interface AppAxiosError extends AxiosError {
  isSilent?: boolean;
  isAuthError?: boolean;
  isSessionExpired?: boolean;
  isBusinessError?: boolean;
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

interface ApiResponse<T = unknown> {
  status?: string;
  message?: string;
  error?: string;
  data?: T;
}

interface QueueItem {
  resolve: () => void;
  reject: (reason?: unknown) => void;
}
// http://localhost:8080
// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════
export const API_HOST = import.meta.env.VITE_API_URL || '';

/** ⚠️ KHÔNG append `/api` — endpoint đã có prefix này */
export const API_BASE_URL = API_HOST;

export const APP_CONFIG = {
  API_BASE_URL: API_HOST,
  API_TIMEOUT: 30000,
  REFRESH_TIMEOUT: 10000,
} as const;

// ══════════════════════════════════════════════════════════════
// CREATE INSTANCE
// ══════════════════════════════════════════════════════════════
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  withCredentials: true, // ✅ Cookie-based auth khớp BE
  headers: { 'Content-Type': 'application/json' },
});

// Auto-bỏ Content-Type khi gửi FormData (multipart)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// ══════════════════════════════════════════════════════════════
// DEBUG
// ══════════════════════════════════════════════════════════════
const DEBUG = import.meta.env.DEV;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let isRefreshing = false;
let failedQueue: QueueItem[] = [];

// ══════════════════════════════════════════════════════════════
// URL LISTS
// ══════════════════════════════════════════════════════════════
const NO_REFRESH_URLS: string[] = [
  API_ENDPOINT.AUTH_LOGIN,
  API_ENDPOINT.AUTH_REGISTER,
  API_ENDPOINT.AUTH_REFRESH_TOKEN,
  API_ENDPOINT.AUTH_LOGOUT,
  API_ENDPOINT.AUTH_FORGOT_PASSWORD,
  API_ENDPOINT.AUTH_VERIFY_OTP,
  API_ENDPOINT.AUTH_RESET_PASSWORD,
];

const SILENT_URLS: string[] = [API_ENDPOINT.AUTH_REFRESH_TOKEN];

// ══════════════════════════════════════════════════════════════
// SESSION EXPIRED EMITTER
// ══════════════════════════════════════════════════════════════
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export const subscribeSessionExpired = (
  listener: SessionExpiredListener
): (() => void) => {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
};

const emitSessionExpired = () => {
  sessionExpiredListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[axiosConfig] sessionExpired listener error:', e);
    }
  });
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
};

const extractErrorMessage = (error: AppAxiosError): string => {
  if (!error.response) {
    return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
  }

  const data = error.response.data as ApiResponse | undefined;
  if (data?.message) return data.message;
  if (data?.error) return data.error;

  const statusMessages: Record<number, string> = {
    400: 'Yêu cầu không hợp lệ',
    401: 'Phiên đăng nhập đã hết hạn',
    403: 'Bạn không có quyền truy cập',
    404: 'Không tìm thấy tài nguyên',
    409: 'Dữ liệu đã tồn tại',
    423: 'Tài khoản đang bị khóa',
    429: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    500: 'Lỗi hệ thống, vui lòng thử lại sau',
  };

  return statusMessages[error.response.status] || 'Có lỗi xảy ra';
};

const shouldSkipRefresh = (url?: string): boolean =>
  url ? NO_REFRESH_URLS.some((e) => url.includes(e)) : false;

const shouldBeSilent = (url?: string): boolean =>
  url ? SILENT_URLS.some((e) => url.includes(e)) : false;

// ══════════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR
// ══════════════════════════════════════════════════════════════
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!shouldBeSilent(config.url)) {
      log('🔵 Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error: AxiosError) => {
    log('❌ Request Error:', error.message);
    return Promise.reject(error);
  }
);

// ══════════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR
// ══════════════════════════════════════════════════════════════
api.interceptors.response.use(
  // ── Success handler ──
  (response) => {
    if (!shouldBeSilent(response.config.url)) {
      log('🟢 Response:', response.status, response.config.url);
    }

    // BE trả { status: 'error' } dù HTTP 200 → reject
    const data = response.data as ApiResponse | undefined;
    if (data?.status === 'error') {
      const err = new Error(
        data.message || data.error || 'Có lỗi xảy ra từ server'
      ) as AppAxiosError;
      err.response = response;
      err.isBusinessError = true;
      err.isSilent = shouldBeSilent(response.config.url);
      return Promise.reject(err);
    }

    return response;
  },

  // ── Error handler ──
  async (error: AxiosError) => {
    const appErr = error as AppAxiosError;
    const originalRequest = appErr.config as RetryConfig | undefined;
    const silent = shouldBeSilent(originalRequest?.url);

    if (appErr.response) {
      appErr.message = extractErrorMessage(appErr);
    }

    // ── Silent URL fail 401 ──
    if (silent && appErr.response?.status === 401) {
      appErr.isSilent = true;
      appErr.isAuthError = true;
      appErr.isSessionExpired = true;
      emitSessionExpired();
      return Promise.reject(appErr);
    }

    // ── Không phải 401, hoặc đã retry ──
    if (
      appErr.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(appErr);
    }

    // ── Endpoint không được refresh ──
    if (shouldSkipRefresh(originalRequest.url)) {
      return Promise.reject(appErr);
    }

    // ── Đang refresh → queue ──
    if (isRefreshing) {
      originalRequest._retry = true; // 🆕 tránh loop vô tận
      log('⏳ Đang refresh, queue request:', originalRequest.url);

      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          log('🔄 Retry từ queue:', originalRequest.url);
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // ── Bắt đầu refresh ──
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      log('⚠️ Access token hết hạn — gọi refresh-token...');
      await api.post(API_ENDPOINT.AUTH_REFRESH_TOKEN, null, {
        timeout: APP_CONFIG.REFRESH_TIMEOUT,
      });
      log('✅ Refresh thành công, cookie mới đã set');

      processQueue(null);
      isRefreshing = false;

      return api(originalRequest);
    } catch (refreshError: unknown) {
      const err = refreshError as AppAxiosError;
      const isAuthFail = err?.response?.status === 401;

      if (isAuthFail) {
        err.isSilent = true;
        err.isAuthError = true;
        err.isSessionExpired = true;
        emitSessionExpired();
      } else {
        log('❌ Refresh thất bại:', err?.message);
      }

      processQueue(refreshError);
      isRefreshing = false;

      return Promise.reject(refreshError);
    }
  }
);

export default api;