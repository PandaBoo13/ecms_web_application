package com.ecms_web_application.OC01.config;

public class APIURL {

    // ============================================================
    // PUBLIC — Không cần đăng nhập
    // ============================================================
    public static final String[] PUBLIC_URLS = {
            // Static & system
            "/",
            "/error",                 // Spring Boot default error page
            "/favicon.ico",
            "/.well-known/**",
            "/uploads/**",            // serve file tĩnh
            "/files/**",

            // Swagger / OpenAPI (Springdoc 2.x)
            "/swagger-ui/**",
            "/swagger-ui.html",       // ← QUAN TRỌNG: Springdoc redirect qua đây
            "/v3/api-docs/**",

            // OAuth2 (Google login)
            "/oauth2/authorization/**",
            "/login/oauth2/code/**",

            // Auth — public endpoints
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh-token",
            "/api/auth/forgot-password",
            "/api/auth/verify-otp",
            "/api/auth/reset-password",

            // Public browse (landing page không login)
            "/api/public/**",
    };

    // ============================================================
    // USER — Đã đăng nhập (mọi role: STUDENT, INSTRUCTOR, ADMIN)
    // Chỉ self-service
    // ============================================================
    public static final String[] USER_URLS = {
            // Auth — self
            "/api/auth/logout",
            "/api/auth/me",
            "/api/auth/change-password",

            // Self profile
            "/api/users/me",

            // 🆕 Instructor self-manage chuyên môn
            "/api/instructors/me/specializations",
            "/api/instructors/me/specializations/**",

            // File upload (mọi user đã login đều upload được)
            "/api/files/**",
    };

    // ============================================================
    // ADMIN — Chỉ ADMIN
    // ============================================================
    public static final String[] ADMIN_URLS = {
            // RBAC toàn bộ
            "/api/rbac/**",
    };

    // ============================================================
    // PROTECTED — Cần permission cụ thể (check DB)
    // Dùng cho các hành động nguy hiểm / cần kiểm soát chặt
    // Permission được gán trong bảng `permission` + `account_permission`
    // ============================================================
    public static final String[] PROTECTED_URLS = {
            // Category — đọc cho mọi user, ghi cần permission
            "/api/categories/**",
            "/api/categories",

            // Instructor — xem chuyên môn (ngoài self)
            "/api/instructors/*/specializations",
            "/api/instructors/category/*/specializations",
    };
}