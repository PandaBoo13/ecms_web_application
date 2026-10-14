package com.ecms_web_application.OC01.config;

import com.ecms_web_application.OC01.service.impl.CustomOAuth2UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;


/**
 * Cấu hình OAuth2 để xử lý xác thực người dùng từ các nhà cung cấp OAuth2 (Google, Facebook, v.v.).
 * Cung cấp các bean cho việc xử lý người dùng OAuth2 và OpenID Connect (OIDC).
 */
@Configuration
public class OAuth2Config {

    private final CustomOAuth2UserService customOAuth2UserService;

    /**
     * Constructor để inject `CustomOAuth2UserService`.
     */
    public OAuth2Config(CustomOAuth2UserService customOAuth2UserService) {
        this.customOAuth2UserService = customOAuth2UserService;
    }

    /**
     * Cấu hình dịch vụ xử lý người dùng OIDC (OpenID Connect).
     * - OIDC được sử dụng cho Google Sign-In, cung cấp thêm thông tin profile qua `id_token`.
     * - Chúng ta sử dụng `CustomOAuth2UserService` để xử lý người dùng đăng nhập.
     */
    @Bean
    public OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService() {
        return userRequest -> (OidcUser) customOAuth2UserService.loadUser(userRequest);
    }

    /**
     * Cấu hình dịch vụ xử lý người dùng OAuth2.
     * - Được sử dụng cho các OAuth2 providers như Facebook, GitHub, v.v.
     * - `CustomOAuth2UserService` sẽ chịu trách nhiệm xử lý thông tin người dùng.
     */
    @Bean
    public OAuth2UserService<OAuth2UserRequest, OAuth2User> oAuth2UserService() {
        return customOAuth2UserService;
    }
}
