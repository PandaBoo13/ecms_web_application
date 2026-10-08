package com.ecms_web_application.OC01.config;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.AuthSession;
import com.ecms_web_application.OC01.entity.enums.DeviceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.AuthSessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;


import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Sau OAuth2 login thành công:
 * 1. Lấy email từ principal
 * 2. Query Account từ DB
 * 3. Sinh JWT + set HttpOnly cookies
 * 4. Lưu AuthSession
 * 5. Redirect về FE
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final AuthSessionRepository authSessionRepository;
    private final AccountRepository accountRepository;

    @Value("${app.oauth2.success-redirect:http://localhost:3000/oauth2/redirect}")
    private String successRedirectUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        String email = extractEmail(authentication);

        Account account = accountRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Không tìm thấy account sau OAuth2 login: " + email));

        // ✅ Sửa: CUSTOMER (không phải CUSTOMER_STD)
        String roleCode = account.getRole() != null ? account.getRole().getCode() : "CUSTOMER";

        String accessToken = jwtService.generateAccessTokenWithUserInfo(
                account.getEmail(),
                Math.toIntExact(account.getId()),
                account.getEmail(),
                roleCode
        );
        String refreshToken = jwtService.generateRefreshToken(account.getEmail());

        AuthSession session = new AuthSession();
        session.setAccount(account);
        session.setRefreshTokenHash(hashToken(refreshToken));
        session.setDeviceType(DeviceType.WEB);
        session.setLastActiveAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusDays(30));
        session.setCreatedAt(LocalDateTime.now());
        authSessionRepository.save(session);

        int accessTtlSeconds = jwtService.getAccessTokenExpirationSeconds();
        cookieUtil.addAccessTokenCookie(response, accessToken, accessTtlSeconds);
        cookieUtil.addRefreshTokenCookie(response, refreshToken, 30 * 24 * 60 * 60);

        log.info("OAuth2 login thành công: email={}, role={}", account.getEmail(), roleCode);

        getRedirectStrategy().sendRedirect(request, response, successRedirectUrl);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private String extractEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();

        if (principal instanceof OAuth2User oAuth2User) {
            Object email = oAuth2User.getAttributes().get("email");
            if (email == null) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "OAuth2 provider không trả email");
            }
            return email.toString();
        }

        throw new IllegalStateException("Principal không phải OAuth2User: "
                + principal.getClass());
    }

    private String hashToken(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Không thể hash token", e);
        }
    }
}