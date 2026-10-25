package com.ecms_web_application.OC01.config;

public class APIURL {

    // ============================================================
    // PUBLIC — Không cần đăng nhập
    // ============================================================
    public static final String[] PUBLIC_URLS = {
            // Static & system
            "/",
            "/error",
            "/favicon.ico",
            "/.well-known/**",
            "/uploads/**",
            "/files/**",

            // Swagger / OpenAPI
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",

            // OAuth2 (Google login)
            "/oauth2/authorization/**",
            "/login/oauth2/code/**",

            // WebSocket (handshake + SockJS fallback)
            "/ws",
            "/ws/**",

            // Auth — public endpoints
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh-token",
            "/api/auth/forgot-password",
            "/api/auth/verify-otp",
            "/api/auth/reset-password",

            // Public browse (landing page không login)
            "/api/public/**",

            // Course browse cho guest
            "/api/courses",
            "/api/courses/**",
    };

    // ============================================================
    // USER — Đã đăng nhập (mọi role: STUDENT, INSTRUCTOR, ADMIN)
    // ============================================================
    public static final String[] USER_URLS = {
            // Auth — self
            "/api/auth/logout",
            "/api/auth/me",
            "/api/auth/change-password",

            // Self profile
            "/api/users/me",

            // Instructor self-manage chuyên môn
            "/api/instructors/me/specializations",
            "/api/instructors/me/specializations/**",

            // File upload
            "/api/files/**",

            // Progress
            "/api/progress",
            "/api/progress/**",

            // ============================================================
            // 🆕 CHAT & NOTIFICATION — self-service, mọi user đã login
            // Ownership được check ở Service layer (requireActiveParticipant,
            // findMyConversations, findInbox...). Filter không cần check
            // permission vì đây là dữ liệu của chính user.
            // ============================================================
            "/api/chat/**",
            "/api/notifications/**",

            // Quiz self-service — HV làm bài, GV xem. Phân quyền GV/Admin qua @PreAuthorize.
            "/api/courses/*/quizzes",
            "/api/courses/*/quizzes/**",
    };

    // ============================================================
    // ADMIN — Chỉ ADMIN
    // ============================================================
    public static final String[] ADMIN_URLS = {
            "/api/rbac/**",
    };

    // ============================================================
    // PROTECTED — Cần permission cụ thể (check DB)
    // ============================================================
    public static final String[] PROTECTED_URLS = {
            // Category
            "/api/categories/**",
            "/api/categories",

            // Instructor — xem chuyên môn (ngoài self)
            "/api/instructors/*/specializations",
            "/api/instructors/*/specializations/**",
            "/api/instructors/category/*/specializations",
            "/api/instructors/category/*/specializations/**",

            // Course write + lifecycle
            "/api/courses/*/submit-review",
            "/api/courses/*/review",
            "/api/courses/*/archive",
            "/api/courses/*/cancel",
            "/api/courses/*/copy",
            "/api/courses/*/offline-info",
            "/api/courses/*/hard",
            "/api/courses/*/teacher",

            // Course nested
            "/api/courses/*/resources",
            "/api/courses/*/resources/**",
            "/api/courses/*/sessions",
            "/api/courses/*/sessions/**",
            "/api/courses/*/questions",
            "/api/courses/*/questions/**",

            // Audit log
            "/api/audit-logs",
            "/api/audit-logs/**",
            "/api/rooms",
            "/api/rooms/**",

            // Lead
            "/api/leads",
            "/api/leads/**",

            // Student
            "/api/students",
            "/api/students/**",
    };
}