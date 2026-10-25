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
  COURSE_CHANGE_TEACHER: (id: number) => `/api/courses/${id}/teacher`,

  // ══════════════════════════════════════════════════════════════
  // RESOURCES
  // ══════════════════════════════════════════════════════════════
  RESOURCES: (courseId: number) => `/api/courses/${courseId}/resources`,
  RESOURCE_TREE: (courseId: number) => `/api/courses/${courseId}/resources/tree`,
  RESOURCE_DETAIL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/resources/${id}`,
  RESOURCE_REORDER: (courseId: number) => `/api/courses/${courseId}/resources/reorder`,

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
  SESSION_GENERATE: (courseId: number) =>
    `/api/courses/${courseId}/sessions/generate`,
  SESSION_DONE: (courseId: number, id: number) =>
    `/api/courses/${courseId}/sessions/${id}/done`,
  SESSION_SUBSTITUTE_TEACHER: (courseId: number, id: number) =>
    `/api/courses/${courseId}/sessions/${id}/substitute-teacher`,
  SESSION_ASSISTANT: (courseId: number, id: number) =>
    `/api/courses/${courseId}/sessions/${id}/assistant`,

  // ══════════════════════════════════════════════════════════════
  // QUESTIONS
  // ══════════════════════════════════════════════════════════════
  QUESTIONS: (courseId: number) => `/api/courses/${courseId}/questions`,
  QUESTION_DETAIL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/questions/${id}`,

  // ══════════════════════════════════════════════════════════════
  // QUIZZES
  // ══════════════════════════════════════════════════════════════
  QUIZZES: (courseId: number) => `/api/courses/${courseId}/quizzes`,
  QUIZ_DETAIL: (courseId: number, id: number) =>
    `/api/courses/${courseId}/quizzes/${id}`,
  QUIZ_START: (courseId: number, id: number) =>
    `/api/courses/${courseId}/quizzes/${id}/start`,
  QUIZ_SUBMIT: (courseId: number, id: number) =>
    `/api/courses/${courseId}/quizzes/${id}/submit`,
  QUIZ_ATTEMPTS: (courseId: number, id: number) =>
    `/api/courses/${courseId}/quizzes/${id}/attempts`,
  QUIZ_ATTEMPT_DETAIL: (courseId: number, id: number, attemptId: number) =>
    `/api/courses/${courseId}/quizzes/${id}/attempts/${attemptId}`,

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
  // Roles
  RBAC_ROLES: '/api/rbac/roles',
  RBAC_ROLE_DETAIL: (id: number) => `/api/rbac/roles/${id}`,
  RBAC_ROLE_ACCOUNTS: (roleId: number) => `/api/rbac/roles/${roleId}/accounts`,

  // Permissions
  RBAC_PERMISSIONS: '/api/rbac/permissions',
  RBAC_PERMISSION_DETAIL: (id: number) => `/api/rbac/permissions/${id}`,
  RBAC_PERMISSIONS_ALL: '/api/rbac/permissions/all',
  RBAC_PERMISSIONS_MODULES: '/api/rbac/permissions/modules',
  RBAC_PERMISSIONS_SYNC: '/api/rbac/permissions/sync',

  // Role ↔ Permission
  RBAC_ROLE_PERMISSIONS: (roleId: number) => `/api/rbac/roles/${roleId}/permissions`,
  RBAC_ROLE_PERMISSIONS_BATCH: (roleId: number) => `/api/rbac/roles/${roleId}/permissions/batch`,
  RBAC_ROLE_PERMISSION_DETAIL: (roleId: number, permissionId: number) =>
    `/api/rbac/roles/${roleId}/permissions/${permissionId}`,
  RBAC_ROLE_PERMISSION_ACTIVATE: (roleId: number, permissionId: number) =>
    `/api/rbac/roles/${roleId}/permissions/${permissionId}/activate`,
  RBAC_ROLE_PERMISSION_DEACTIVATE: (roleId: number, permissionId: number) =>
    `/api/rbac/roles/${roleId}/permissions/${permissionId}/deactivate`,

  // Accounts
  RBAC_ACCOUNTS: '/api/rbac/accounts',
  RBAC_ACCOUNT_DETAIL: (id: number) => `/api/rbac/accounts/${id}`,
  RBAC_ACCOUNT_ROLES: (id: number) => `/api/rbac/accounts/${id}/roles`,
  RBAC_ACCOUNT_ROLE: (id: number) => `/api/rbac/accounts/${id}/role`,
  RBAC_ACCOUNTS_TEACHERS: '/api/rbac/accounts/teachers',
  RBAC_ACCOUNT_LOCK: (id: number) => `/api/rbac/accounts/${id}/lock`,

  // ══════════════════════════════════════════════════════════════
  // AUDIT
  // ══════════════════════════════════════════════════════════════
  AUDIT_LOGS: '/api/audit-logs',

  // ══════════════════════════════════════════════════════════════
  // FILES
  // ══════════════════════════════════════════════════════════════
  FILES_UPLOAD: '/api/files/upload',

  // ══════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATION_DETAIL: (id: number) => `/api/notifications/${id}`,
  NOTIFICATIONS_UNREAD_COUNT: '/api/notifications/unread-count',
  NOTIFICATION_MARK_READ: (id: number) => `/api/notifications/${id}/read`,
  NOTIFICATION_MARK_ALL_READ: '/api/notifications/read-all',
  NOTIFICATION_DELETE: (id: number) => `/api/notifications/${id}`,
  NOTIFICATION_DELETE_ALL: '/api/notifications',

  // ══════════════════════════════════════════════════════════════
  // CHAT
  // ══════════════════════════════════════════════════════════════
  CHAT_CONVERSATIONS: '/api/chat/conversations',
  CHAT_CONVERSATION_DETAIL: (id: number) => `/api/chat/conversations/${id}`,
  CHAT_MESSAGES: (id: number) => `/api/chat/conversations/${id}/messages`,
  CHAT_MARK_READ: (id: number) => `/api/chat/conversations/${id}/read`,
  CHAT_MESSAGE_DETAIL: (id: number) => `/api/chat/messages/${id}`,
  CHAT_USERS_SEARCH: '/api/chat/users/search',

  // ══════════════════════════════════════════════════════════════
  // LEADS
  // ══════════════════════════════════════════════════════════════
  LEADS: '/api/leads',
  LEAD_DETAIL: (id: number) => `/api/leads/${id}`,
  LEAD_FULL_DETAIL: (id: number) => `/api/leads/${id}/detail`,
  LEAD_ASSIGN: (id: number) => `/api/leads/${id}/assign`,
  LEAD_INTERACTIONS: (id: number) => `/api/leads/${id}/interactions`,
  LEAD_PLACEMENT_TESTS: (id: number) => `/api/leads/${id}/placement-tests`,

  // ══════════════════════════════════════════════════════════════
  // STUDENTS
  // ══════════════════════════════════════════════════════════════
  STUDENTS: '/api/students',
  STUDENT_DETAIL: (id: number) => `/api/students/${id}`,
  STUDENT_FULL_DETAIL: (id: number) => `/api/students/${id}/detail`,
  STUDENT_BY_CODE: (code: string) => `/api/students/code/${code}`,
  STUDENT_CONVERT_LEAD: '/api/students/convert-lead',
  STUDENT_STATUS: (id: number) => `/api/students/${id}/status`,
  STUDENT_LOCK_ACCOUNT: (id: number) => `/api/students/${id}/lock-account`,
  STUDENT_GUARDIANS: (id: number) => `/api/students/${id}/guardians`,
  STUDENT_GUARDIAN_DETAIL: (id: number, guardianId: number) => `/api/students/${id}/guardians/${guardianId}`,
  STUDENT_ACADEMIC_HISTORIES: (id: number) => `/api/students/${id}/academic-histories`,

  // ══════════════════════════════════════════════════════════════
  // AI AGENT
  // ══════════════════════════════════════════════════════════════
  AI_AGENT_CHAT: '/api/ai-agent/chat',

} as const;