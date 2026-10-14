package com.ecms_web_application.OC01.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Component
public class CookieUtil {

    @Value("${cookie.access-token-name}")
    private String accessTokenName;

    @Value("${cookie.refresh-token-name}")
    private String refreshTokenName;

    @Value("${cookie.domain:}")
    private String cookieDomain;

    @Value("${cookie.path:/}")
    private String cookiePath;

    @Value("${cookie.secure:false}")
    private boolean secure;

    @Value("${cookie.http-only:true}")
    private boolean httpOnly;

    @Value("${cookie.same-site:Lax}")
    private String sameSite;

    public void addAccessTokenCookie(HttpServletResponse response, String token, int maxAge) {
        addCookie(response, accessTokenName, token, maxAge);
    }

    public void addRefreshTokenCookie(HttpServletResponse response, String token, int maxAge) {
        addCookie(response, refreshTokenName, token, maxAge);
    }

    public void clearCookies(HttpServletResponse response) {
        addCookie(response, accessTokenName, "", 0);
        addCookie(response, refreshTokenName, "", 0);
    }

    public Optional<String> getAccessTokenFromCookies(HttpServletRequest request) {
        return getCookieValue(request, accessTokenName);
    }

    public Optional<String> getRefreshTokenFromCookies(HttpServletRequest request) {
        return getCookieValue(request, refreshTokenName);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(httpOnly)
                .secure(secure)
                .path(cookiePath)
                .maxAge(maxAge)
                .sameSite(sameSite);

        // ⚠️ FIX: chỉ set domain khi có giá trị — tránh header "Domain=" rỗng
        if (cookieDomain != null && !cookieDomain.trim().isEmpty()) {
            builder.domain(cookieDomain);
        }

        response.addHeader("Set-Cookie", builder.build().toString());
    }

    private Optional<String> getCookieValue(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();

        return Arrays.stream(cookies)
                .filter(cookie -> cookieName.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}