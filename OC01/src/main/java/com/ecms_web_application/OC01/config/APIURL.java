package com.ecms_web_application.OC01.config;

public class APIURL {

    // ============================================================
    // PUBLIC — Không cần đăng nhập (chỉ GET mới pass qua filter)
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

            // VNPAY server-to-server IPN callback (signature verified by Tuition module)
            "/api/tuition/payments/vnpay/ipn",

            // Course browse cho guest
            "/api/courses",
            "/api/courses/**",
    };

    // ============================================================
    // USER — Đã đăng nhập (mọi role: STUDENT, INSTRUCTOR, ADMIN)
    // Không cần check quyền ở filter — service/controller tự check
    // ============================================================
    public static final String[] USER_URLS = {
            // Auth — self
            "/api/auth/logout",
            "/api/auth/me",
            "/api/auth/change-password",

            // Self profile
            "/api/users/me",

            // Tuition self-service: invoice ownership and administrative actions
            // are enforced by TuitionService/VnpayGatewayService.
            "/api/tuition/invoices",
            "/api/tuition/invoices/**",

            // Instructor self-manage chuyên môn
            "/api/instructors/me/specializations",
            "/api/instructors/me/specializations/**",

            // File upload
            "/api/files/**",

            // Progress
            "/api/progress",
            "/api/progress/**",

            // Request workflow — mọi user đã đăng nhập đều truy cập được;
            // quyền chi tiết (requester/resolver/approver) do RequestService.assertCan* check
            "/api/requests",
            "/api/requests/**",

            // Chat & Notification — self-service
            "/api/chat/**",
            "/api/notifications/**",

            // Quiz self-service
            "/api/courses/*/quizzes",
            "/api/courses/*/quizzes/**",
    };

    // ============================================================
    // ADMIN — Chỉ ADMIN
    // ============================================================
    public static final String[] ADMIN_URLS = {
            "/api/rbac/**",
    };

    // ĐÃ XÓA PROTECTED_URLS
}
