package com.ecms_web_application.OC01.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
@Slf4j                                    // 🆕 Thêm log
public class JwtService {

    @Value("${jwt.secret:HarlestXakasjdhh12sadadwqdasdeascfasddacxajkasdjndhwnas}")
    private String jwtKey;

    @Value("${jwt.access-token-expiration:900000}")     // 🆕 default 15 phút
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration:2592000000}") // 🆕 default 30 ngày
    private Long refreshTokenExpiration;

    // ============================================================
    // SECRET KEY
    // ============================================================
    private SecretKey getSignKey() {
        byte[] keyBytes = jwtKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ============================================================
    // GENERATE TOKEN
    // ============================================================
    public String generateAccessToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        return generateAccessToken(claims, username);
    }

    public String generateAccessToken(Map<String, Object> claims, String username) {
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(getSignKey())
                .compact();
    }

    public String generateAccessTokenWithUserInfo(String username, Integer userId,
                                                  String email, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("email", email);
        claims.put("role", role);
        claims.put("tokenType", "access");
        return generateAccessToken(claims, username);
    }

    public String generateRefreshToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tokenType", "refresh");
        return generateRefreshToken(claims, username);
    }

    public String generateRefreshToken(Map<String, Object> claims, String username) {
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(getSignKey())
                .compact();
    }

    // ============================================================
    // EXTRACT
    // ============================================================
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public Claims extractAllClaimsFromToken(String token) {
        return extractAllClaims(token);
    }

    public <T> T extractClaim(String token, String claimKey, Class<T> claimType) {
        Claims claims = extractAllClaims(token);
        return claims.get(claimKey, claimType);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ============================================================
    // VALIDATE
    // ============================================================
    public Boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            log.warn("isTokenExpired failed: {}", e.getMessage());
            return true;                   // 🆕 Coi như expired nếu parse fail
        }
    }

    /**
     * ✅ FIX: Dùng equalsIgnoreCase + log khi fail
     */
    public Boolean validateToken(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            final String dbUsername = userDetails.getUsername();

            if (username == null || dbUsername == null) {
                log.warn("validateToken: username null. token=[{}], db=[{}]", username, dbUsername);
                return false;
            }

            boolean usernameMatch = username.equalsIgnoreCase(dbUsername);   // 🆕 ignoreCase
            boolean notExpired = !isTokenExpired(token);

            if (!usernameMatch) {
                log.warn("validateToken: username mismatch. token=[{}], db=[{}]",
                        username, dbUsername);
            }
            if (!notExpired) {
                log.warn("validateToken: token expired for [{}]", username);
            }

            return usernameMatch && notExpired;
        } catch (Exception e) {
            log.warn("validateToken failed: {}", e.getMessage());
            return false;
        }
    }

    public Boolean validateToken(String token) {
        try {
            return !isTokenExpired(token);
        } catch (Exception e) {
            log.warn("validateToken(single) failed: {}", e.getMessage());
            return false;
        }
    }

    // ============================================================
    // TOKEN TYPE CHECK
    // ============================================================
    public Boolean isAccessToken(String token) {
        try {
            String tokenType = extractClaim(token, "tokenType", String.class);
            return "access".equals(tokenType);
        } catch (Exception e) {
            log.warn("isAccessToken failed: {}", e.getMessage());
            return false;
        }
    }

    public Boolean isRefreshToken(String token) {
        try {
            String tokenType = extractClaim(token, "tokenType", String.class);
            return "refresh".equals(tokenType);
        } catch (Exception e) {
            log.warn("isRefreshToken failed: {}", e.getMessage());
            return false;
        }
    }

    // ============================================================
    // TTL HELPERS
    // ============================================================
    public int getAccessTokenExpirationSeconds() {
        return (int) (accessTokenExpiration / 1000);
    }

    public int getRefreshTokenExpirationSeconds() {
        return (int) (refreshTokenExpiration / 1000);
    }
}