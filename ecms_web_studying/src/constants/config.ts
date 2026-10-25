export const APP_CONFIG = {
  APP_NAME: 'ECMS Web Admin',
  APP_VERSION: '1.0.0',

  API: {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    TIMEOUT: 30000,
  },

  STORAGE_KEYS: {
    ACCESS_TOKEN: '@ecms/accessToken',
    REFRESH_TOKEN: '@ecms/refreshToken',
    USER_INFO: '@ecms/userInfo',
    THEME: '@ecms/theme',
  },

  PAGINATION: {
    DEFAULT_PAGE: 0,
    DEFAULT_SIZE: 20,
    SIZE_OPTIONS: ['10', '20', '50', '100'],
  },

  DATE_FORMAT: {
    SHORT: 'DD/MM/YYYY',
    LONG: 'DD/MM/YYYY HH:mm',
    ISO: 'YYYY-MM-DD',
  },
} as const;