package com.ecms_web_application.OC01.config;

import com.ecms_web_application.OC01.exception.ExceptionResponse;
import com.ecms_web_application.OC01.service.AccountService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;



import java.io.IOException;
import java.util.Optional;

@Component
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    @Autowired private JwtService jwtService;
    @Autowired @Lazy private AccountService accountService;
    @Autowired private CookieUtil cookieUtil;

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        log.debug("🛡️ JwtFilter: {} {}", method, path);

        // 1. AUTH ENDPOINTS → skip
        if (isAuthPath(path)) {
            log.debug("   ↳ Auth path → skip");
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Đọc token
        Optional<String> tokenOpt = cookieUtil.getAccessTokenFromCookies(request);

        if (tokenOpt.isEmpty()) {
            log.debug("   ↳ Cookie access_token: KHÔNG CÓ");
        } else {
            log.debug("   ↳ Cookie access_token: CÓ ({} chars)", tokenOpt.get().length());
        }

        // 3. Validate
        if (tokenOpt.isPresent()) {
            String token = tokenOpt.get();
            try {
                boolean isAccess = jwtService.isAccessToken(token);
                boolean isExpired = jwtService.isTokenExpired(token);
                String username = jwtService.extractUsername(token);

                log.debug("   ↳ isAccessToken={} isExpired={} username=[{}]",
                        isAccess, isExpired, username);

                if (isAccess && !isExpired) {
                    if (username != null
                            && SecurityContextHolder.getContext().getAuthentication() == null) {

                        UserDetails userDetails = accountService.loadUserByUsername(username);

                        log.debug("   ↳ userDetails.getUsername()=[{}]",
                                userDetails.getUsername());

                        boolean valid = jwtService.validateToken(token, userDetails);

                        log.debug("   ↳ validateToken = {}", valid);

                        if (valid) {
                            UsernamePasswordAuthenticationToken authToken =
                                    new UsernamePasswordAuthenticationToken(
                                            userDetails, null, userDetails.getAuthorities());
                            authToken.setDetails(
                                    new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);

                            log.debug("   ↳ ✅ Set Authentication thành công");
                        } else {
                            log.warn("   ↳ ❌ validateToken=false cho [{}]", username);
                        }
                    }
                } else {
                    log.warn("   ↳ ❌ Token invalid: isAccess={}, isExpired={}",
                            isAccess, isExpired);
                }
            } catch (Exception e) {
                log.warn("   ↳ ❌ JWT exception for path={}: {}",
                        path, e.getMessage(), e);
            }
        }

        // 4. Public GET → qua
        if ("GET".equalsIgnoreCase(method) && isPublicPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 5. Non-public: bắt buộc token
        if (tokenOpt.isEmpty()) {
            log.warn("🛡️ 401 {} {} — Access token not found", method, path);
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, "Access token not found");
            return;
        }

        // 6. Chưa set Authentication
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            log.warn("🛡️ 401 {} {} — Invalid access token", method, path);
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, "Invalid access token");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAuthPath(String path) {
        String[] authPaths = {
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/refresh-token",
                "/api/auth/forgot-password",
                "/api/auth/verify-otp",
                "/api/auth/reset-password",
                "/api/auth/check-token",
                "/oauth2/authorization",
                "/api/oauth2"
        };
        for (String authPath : authPaths) {
            if (path.startsWith(authPath)) return true;
        }
        return false;
    }

    private boolean isPublicPath(String path) {
        for (String publicUrl : APIURL.PUBLIC_URLS) {
            if (pathMatcher.match(publicUrl, path)) return true;
        }
        return false;
    }

    /**
     * ✅ FIX: Dùng `ExceptionResponse` (đã có status = "error")
     * thay vì `RequestResponse` (status = "success").
     */
    private void sendErrorResponse(HttpServletResponse response,
                                   HttpStatus status,
                                   String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        // ✅ ExceptionResponse — status = "error" (đúng)
        ExceptionResponse errorResponse = new ExceptionResponse(message);

        ObjectMapper mapper = new ObjectMapper();
        response.getWriter().write(mapper.writeValueAsString(errorResponse));
        response.getWriter().flush();
    }
}