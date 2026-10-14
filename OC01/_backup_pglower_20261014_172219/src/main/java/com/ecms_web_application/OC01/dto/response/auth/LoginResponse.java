package com.ecms_web_application.OC01.dto.response.auth;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
public class LoginResponse {

    private String accessToken;

    /**
     * ⚠️ Trong thực tế, refreshToken nên được set vào HttpOnly cookie
     * và KHÔNG trả trong body. Field này giữ lại cho trường hợp
     * client mobile hoặc test API.
     */
    private String refreshToken;

    /** Thời điểm access token hết hạn. */
    private LocalDateTime expiresAt;
}