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

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════
export const API_HOST = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = API_HOST;

export const APP_CONFIG = {
  API_BASE_URL: API_HOST,
  API_TIMEOUT: 30000,
  REFRESH_TIMEOUT: 10000,
  /** Số lần retry ngầm khi refresh fail do network/5xx */
  REFRESH_MAX_RETRIES: 2,
  /** Delay giữa các lần retry (nhân với attempt number) */
  REFRESH_RETRY_DELAY: 1500,
} as const;

// ══════════════════════════════════════════════════════════════
// CREATE INSTANCE
// ══════════════════════════════════════════════════════════════
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
};

/**
 * Đánh dấu lỗi là "silent" + "authError"
 * → Component dùng helper `showError` sẽ KHÔNG hiện toast
 * → Component dùng `toast.error` trực tiếp vẫn sẽ hiện (xem ghi chú cuối)
 */
const markAsSilent = (err: AppAxiosError): AppAxiosError => {
  err.isSilent = true;
  err.isAuthError = true;
  return err;
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
// REFRESH TOKEN (retry ngầm với backoff)
// ══════════════════════════════════════════════════════════════
const doRefreshToken = async (): Promise<void> => {
  let lastError: AppAxiosError | null = null;

  for (let attempt = 0; attempt <= APP_CONFIG.REFRESH_MAX_RETRIES; attempt++) {
    try {
      await api.post(API_ENDPOINT.AUTH_REFRESH_TOKEN, null, {
        timeout: APP_CONFIG.REFRESH_TIMEOUT,
      });
      log(`✅ Refresh token thành công (attempt ${attempt + 1})`);
      return;
    } catch (err) {
      lastError = err as AppAxiosError;

      // 401 (refresh token invalid/expired) → không retry, fail ngay
      if (lastError.response?.status === 401) {
        throw lastError;
      }

      // 5xx / network / timeout → retry ngầm
      const isRetryable =
        !lastError.response ||
        lastError.response.status >= 500 ||
        lastError.code === 'ECONNABORTED' ||
        lastError.code === 'ERR_NETWORK';

      if (!isRetryable || attempt === APP_CONFIG.REFRESH_MAX_RETRIES) {
        throw lastError;
      }

      log(
        `⚠️ Refresh fail (${lastError.message}), retry ${attempt + 1}/${APP_CONFIG.REFRESH_MAX_RETRIES} sau ${APP_CONFIG.REFRESH_RETRY_DELAY * (attempt + 1)}ms...`
      );
      await sleep(APP_CONFIG.REFRESH_RETRY_DELAY * (attempt + 1));
    }
  }

  throw lastError || new Error('Refresh token thất bại');
};

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
      markAsSilent(appErr);
      appErr.isSessionExpired = true;
      emitSessionExpired();
      return Promise.reject(appErr);
    }

    // ── Không phải 401, hoặc đã retry xong ──
    if (
      appErr.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      // ⚠️ 401 do retry (đã refresh xong mà vẫn fail) → đánh dấu silent
      if (appErr.response?.status === 401 && originalRequest?._retry) {
        markAsSilent(appErr);
        appErr.isSessionExpired = true;
        emitSessionExpired();
      }
      return Promise.reject(appErr);
    }

    // ── Endpoint không được refresh ──
    if (shouldSkipRefresh(originalRequest.url)) {
      return Promise.reject(appErr);
    }

    // ── Đang refresh → queue (reject LUÔN silent để component không hiện) ──
    if (isRefreshing) {
      originalRequest._retry = true;
      log('⏳ Đang refresh, queue request:', originalRequest.url);

      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          log('🔄 Retry từ queue:', originalRequest.url);
          return api(originalRequest);
        })
        .catch((err) => {
          // Đảm bảo lỗi từ queue luôn silent
          return Promise.reject(markAsSilent(err as AppAxiosError));
        });
    }

    // ── Bắt đầu refresh ──
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await doRefreshToken();
      processQueue(null);
      isRefreshing = false;

      // Retry request gốc sau khi refresh thành công
      return api(originalRequest);
    } catch (refreshError) {
      const err = markAsSilent(refreshError as AppAxiosError);

      // Chỉ emit session expired khi thực sự 401 (refresh token invalid)
      if (err.response?.status === 401) {
        err.isSessionExpired = true;
        emitSessionExpired();
      } else {
        log('❌ Refresh thất bại sau retry:', err?.message);
      }

      // Queue luôn reject với lỗi silent → component không hiện toast
      processQueue(err);
      isRefreshing = false;

      return Promise.reject(err);
    }
  }
);

export default api;