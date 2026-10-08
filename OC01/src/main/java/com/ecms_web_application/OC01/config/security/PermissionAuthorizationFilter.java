package com.ecms_web_application.OC01.config.security;

import com.ecms_web_application.OC01.config.APIURL;
import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.AccountPermissionService;
import com.ecms_web_application.OC01.service.PermissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter phân quyền — FAIL-CLOSED.
 *
 * Nguyên tắc 3 tầng:
 * - PUBLIC:    Ai cũng gọi được              → pass luôn
 * - USER:      Chỉ cần đăng nhập             → pass luôn (KHÔNG check DB)
 * - PROTECTED: Đăng nhập + có permission cụ thể
 *              → check mapping DB + account_permission
 * - ADMIN:     Role ADMIN                     → bypass (không check DB)
 * - Không khớp nhóm nào: 403 (fail-closed)
 *
 * Lưu ý: APIURL phân loại theo path, method không tham gia phân nhóm.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionAuthorizationFilter extends OncePerRequestFilter {

    private final AccountPermissionService accountPermissionService;
    private final PermissionService permissionService;
    private final ObjectMapper objectMapper;

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

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

        // ── 2. PUBLIC → pass luôn, không cần login ──
        if (matchesPath(APIURL.PUBLIC_URLS, path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 3. Bắt buộc đăng nhập ──
        if (!SecurityUtils.isAuthenticated()) {
            sendError(response, HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập để tiếp tục");
            return;
        }

        // ── 4. ADMIN bypass ──
        if (SecurityUtils.hasRole("ADMIN")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 5. USER → chỉ cần đăng nhập là pass, KHÔNG check DB ──
        if (matchesPath(APIURL.USER_URLS, path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 6. PROTECTED → mapping + account_permission ──
        if (matchesPath(APIURL.PROTECTED_URLS, path)) {
            Long accountId = SecurityUtils.getCurrentAccountId();

            // 6a. Bắt buộc mapping trong DB (method + path)
            boolean hasMapping = permissionService.existsByMethodAndEndpoint(method, path);
            if (!hasMapping) {
                log.warn("[SECURITY] Deny — PROTECTED endpoint chưa mapping: {} {} (accountId={})",
                        method, path, accountId);
                sendError(response, HttpStatus.FORBIDDEN,
                        "Endpoint chưa được cấu hình phân quyền — liên hệ admin");
                return;
            }

            // 6b. Check account có permission chưa
            boolean allowed = accountPermissionService.hasPermission(accountId, method, path);
            if (allowed) {
                filterChain.doFilter(request, response);
                return;
            }

            log.warn("[SECURITY] Deny — accountId={} {} {} (không có permission)",
                    accountId, method, path);
            sendError(response, HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thực hiện hành động này");
            return;
        }

        // ── 7. Fail-closed: không khớp nhóm nào ──
        Long accountId = SecurityUtils.getCurrentAccountId();
        log.warn("[SECURITY] Deny — URL chưa được khai báo nhóm: {} {} (accountId={})",
                method, path, accountId);
        sendError(response, HttpStatus.FORBIDDEN,
                "Endpoint chưa được cấu hình phân quyền — liên hệ admin");
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

        RequestResponse body = new RequestResponse(message);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}