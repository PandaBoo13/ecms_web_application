package com.ecms_web_application.OC01.config.security;

import com.ecms_web_application.OC01.config.APIURL;
import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.exception.ExceptionResponse;
import com.ecms_web_application.OC01.service.AccountPermissionService;
import com.ecms_web_application.OC01.service.PermissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class PermissionAuthorizationFilter extends OncePerRequestFilter {

    private final AccountPermissionService accountPermissionService;
    private final PermissionService permissionService;
    private final ObjectMapper objectMapper;

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    // Danh sách Auth path (luôn bypass)
    private static final String[] AUTH_PATHS = {
            "/api/auth/login", "/api/auth/register", "/api/auth/refresh-token",
            "/api/auth/forgot-password", "/api/auth/verify-otp", "/api/auth/reset-password"
    };

    public PermissionAuthorizationFilter(
            @Lazy AccountPermissionService accountPermissionService,
            @Lazy PermissionService permissionService,
            ObjectMapper objectMapper) {
        this.accountPermissionService = accountPermissionService;
        this.permissionService = permissionService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = normalizePath(request.getRequestURI());
        String method = request.getMethod().toUpperCase();

        // ── 1. OPTIONS preflight ──
        if ("OPTIONS".equals(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 2. AUTH PATHS → luôn pass ──
        if (matchesAuthPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 3. PUBLIC → GET/OPTIONS theo PUBLIC_URLS, POST theo PUBLIC_POST_URLS ──
        if (isPublicRequest(method, path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 4. Bắt buộc đăng nhập ──
        if (!SecurityUtils.isAuthenticated()) {
            sendError(response, HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập để tiếp tục");
            return;
        }

        // ── 5. ADMIN bypass ──
        if (SecurityUtils.hasRole("ADMIN")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 6. USER_URLS → chỉ cần đăng nhập là pass ──
        if (matchesPath(APIURL.USER_URLS, path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 7. TẤT CẢ CÁC URL CÒN LẠI → CHECK QUYỀN TRONG DB (RBAC) ──
        Long accountId = SecurityUtils.getCurrentAccountId();

        // 7a. Kiểm tra Endpoint này đã được khai báo trong bảng Permission chưa
        boolean hasMapping = permissionService.existsByMethodAndEndpoint(method, path);
        if (!hasMapping) {
            log.warn("[SECURITY] Deny — Endpoint chưa mapping: {} {} (accountId={})", method, path, accountId);
            sendError(response, HttpStatus.FORBIDDEN, "Endpoint chưa được cấu hình phân quyền — liên hệ admin");
            return;
        }

        // 7b. Kiểm tra Role của User có quyền này không
        boolean allowed = accountPermissionService.hasPermission(accountId, method, path);
        if (allowed) {
            filterChain.doFilter(request, response);
            return;
        }

        log.warn("[SECURITY] Deny — accountId={} {} {} (không có quyền)", accountId, method, path);
        sendError(response, HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện hành động này");
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private boolean matchesPath(String[] patterns, String path) {
        for (String pattern : patterns) {
            if (PATH_MATCHER.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    /** GET/OPTIONS được public theo PUBLIC_URLS; POST chỉ mở cho danh sách PUBLIC_POST_URLS. */
    private boolean isPublicRequest(String method, String path) {
        if ("GET".equals(method) || "OPTIONS".equals(method)) {
            return matchesPath(APIURL.PUBLIC_URLS, path);
        }
        if ("POST".equals(method)) {
            return matchesPath(APIURL.PUBLIC_POST_URLS, path);
        }
        return false;
    }

    private boolean matchesAuthPath(String path) {
        for (String authPath : AUTH_PATHS) {
            if (authPath.equals(path)) return true;
        }
        return false;
    }

    private String normalizePath(String path) {
        if (path == null) return "/";
        if (path.length() > 1 && path.endsWith("/")) {
            return path.substring(0, path.length() - 1);
        }
        return path;
    }

    private void sendError(HttpServletResponse response,
                           HttpStatus status,
                           String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ExceptionResponse body = new ExceptionResponse(message);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}