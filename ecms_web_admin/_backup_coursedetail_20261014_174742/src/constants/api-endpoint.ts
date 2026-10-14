export const API_ENDPOINT = {
  // ══════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_REFRESH_TOKEN: '/api/auth/refresh-token',
  AUTH_ME: '/api/auth/me',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  AUTH_VERIFY_OTP: '/api/auth/verify-otp',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',

  // ══════════════════════════════════════════════════════════════
  // COURSES
  // ══════════════════════════════════════════════════════════════
  COURSES: '/api/courses',
  COURSE_DETAIL: (id: number) => `/api/courses/${id}`,
  COURSE_OFFLINE_INFO: (id: number) => `/api/courses/${id}/offline-info`,
  COURSE_SUBMIT_REVIEW: (id: number) => `/api/courses/${id}/submit-review`,
  COURSE_REVIEW: (id: number) => `/api/courses/${id}/review`,
  COURSE_ARCHIVE: (id: number) => `/api/courses/${id}/archive`,
  COURSE_CANCEL: (id: number) => `/api/courses/${id}/cancel`,
  COURSE_COPY: (id: number) => `/api/courses/${id}/copy`,
  COURSE_HARD_DELETE: (id: number) => `/api/courses/${id}/hard`,

  // ══════════════════════════════════════════════════════════════
  // RESOURCES
  // ══════════════════════════════════════════════════════════════
  RESOURCES: (courseId: number) => `/api/courses/${courseId}/resources`,
  RESOURCE_TREE: (courseId: number) => `/api/courses/${courseId}/resources/tree`,
  RESOURCE_DETAIL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/resources/${id}`,

  // ══════════════════════════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════════════════════════
  SESSIONS: (courseId: number) => `/api/courses/${courseId}/sessions`,
  SESSION_DETAIL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/sessions/${id}`,
  SESSION_CANCEL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/sessions/${id}/cancel`,
  SESSION_TEACHER: (courseId: number, id: number) =>
    `/api/courses/${courseId}/sessions/${id}/teacher`,

  // ══════════════════════════════════════════════════════════════
  // QUESTIONS
  // ══════════════════════════════════════════════════════════════
  QUESTIONS: (courseId: number) => `/api/courses/${courseId}/questions`,
  QUESTION_DETAIL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/questions/${id}`,

  // ══════════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════════
  CATEGORIES: '/api/categories',
  CATEGORY_DETAIL: (id: number) => `/api/categories/${id}`,
  CATEGORY_TREE: '/api/categories/tree',
  CATEGORY_TREE_ROOT: (rootId: number) => `/api/categories/tree/${rootId}`,
  CATEGORY_ROOTS: '/api/categories/roots',
  CATEGORY_CHILDREN: (parentId: number) => `/api/categories/${parentId}/children`,

  // ══════════════════════════════════════════════════════════════
  // ROOMS
  // ══════════════════════════════════════════════════════════════
  ROOMS: '/api/rooms',
  ROOMS_ACTIVE: '/api/rooms/active',
  ROOM_DETAIL: (id: number) => `/api/rooms/${id}`,

  // ══════════════════════════════════════════════════════════════
  // PROGRESS
  // ══════════════════════════════════════════════════════════════
  PROGRESS_MY_COURSES: '/api/progress/my-courses',
  PROGRESS_COURSE: (courseId: number) => `/api/progress/courses/${courseId}`,
  PROGRESS_RESOURCES: (courseId: number) =>
    `/api/progress/courses/${courseId}/resources`,
  PROGRESS_UPDATE_RESOURCE: (resourceId: number) =>
    `/api/progress/resources/${resourceId}`,
  PROGRESS_COMPLETE_RESOURCE: (resourceId: number) =>
    `/api/progress/resources/${resourceId}/complete`,

  // ══════════════════════════════════════════════════════════════
  // INSTRUCTORS
  // ══════════════════════════════════════════════════════════════
  MY_SPECIALIZATIONS: '/api/instructors/me/specializations',
  MY_SPECIALIZATION_DETAIL: (categoryId: number) =>
    `/api/instructors/me/specializations/${categoryId}`,
  MY_SPECIALIZATION_PRIMARY: (categoryId: number) =>
    `/api/instructors/me/specializations/${categoryId}/primary`,
  MY_SPECIALIZATION_CLEAR_PRIMARY: '/api/instructors/me/specializations/primary',
  INSTRUCTOR_SPECIALIZATIONS: (accountId: number) =>
    `/api/instructors/${accountId}/specializations`,
  INSTRUCTOR_SPECIALIZATION_PRIMARY: (accountId: number) =>
    `/api/instructors/${accountId}/specializations/primary`,
  INSTRUCTOR_SPECIALIZATION_DETAIL: (accountId: number, categoryId: number) =>
    `/api/instructors/${accountId}/specializations/${categoryId}`,
  SPECIALIZATIONS_BY_CATEGORY: (categoryId: number) =>
    `/api/instructors/category/${categoryId}/specializations`,

  // ══════════════════════════════════════════════════════════════
  // RBAC
  // ══════════════════════════════════════════════════════════════
  RBAC_ROLES: '/api/rbac/roles',
  RBAC_ROLE_DETAIL: (id: number) => `/api/rbac/roles/${id}`,
  RBAC_ROLE_ACCOUNTS: (roleId: number) => `/api/rbac/roles/${roleId}/accounts`,
  RBAC_PERMISSIONS: '/api/rbac/permissions',
  RBAC_PERMISSION_DETAIL: (id: number) => `/api/rbac/permissions/${id}`,
  RBAC_PERMISSIONS_ALL: '/api/rbac/permissions/all',
  RBAC_PERMISSIONS_DEFAULT: '/api/rbac/permissions/default',
  RBAC_PERMISSIONS_MODULES: '/api/rbac/permissions/modules',
  RBAC_PERMISSIONS_SYNC: '/api/rbac/permissions/sync',
  RBAC_ACCOUNTS: '/api/rbac/accounts',
  RBAC_ACCOUNT_DETAIL: (id: number) => `/api/rbac/accounts/${id}`,
  RBAC_ACCOUNT_ROLES: (id: number) => `/api/rbac/accounts/${id}/roles`,
  RBAC_ACCOUNT_ROLE: (id: number) => `/api/rbac/accounts/${id}/role`,
  RBAC_ACCOUNT_PERMISSIONS: (id: number) => `/api/rbac/accounts/${id}/permissions`,
  RBAC_ACCOUNT_PERMISSIONS_CUSTOM: (id: number) =>
    `/api/rbac/accounts/${id}/permissions/custom`,
  RBAC_ACCOUNT_PERMISSIONS_BATCH: (id: number) =>
    `/api/rbac/accounts/${id}/permissions/batch`,
  RBAC_ACCOUNT_PERMISSION_DETAIL: (accountId: number, permissionId: number) =>
    `/api/rbac/accounts/${accountId}/permissions/${permissionId}`,
  RBAC_ACCOUNT_PERMISSION_DEACTIVATE: (accountId: number, permissionId: number) =>
    `/api/rbac/accounts/${accountId}/permissions/${permissionId}/deactivate`,
  RBAC_ACCOUNT_PERMISSION_ACTIVATE: (accountId: number, permissionId: number) =>
    `/api/rbac/accounts/${accountId}/permissions/${permissionId}/activate`,
  RBAC_ACCOUNT_PERMISSION_CHECK: (id: number) =>
    `/api/rbac/accounts/${id}/permissions/check`,
  RBAC_ACCOUNT_PERMISSION_CHECK_RESOURCE: (id: number) =>
    `/api/rbac/accounts/${id}/permissions/check-resource`,
  RBAC_ACCOUNTS_TEACHERS: '/api/rbac/accounts/teachers',

  // ══════════════════════════════════════════════════════════════
  // AUDIT
  // ══════════════════════════════════════════════════════════════
  AUDIT_LOGS: '/api/audit-logs',

  // ══════════════════════════════════════════════════════════════
  // FILES
  // ══════════════════════════════════════════════════════════════
  FILES_UPLOAD: '/api/files/upload',
} as const;