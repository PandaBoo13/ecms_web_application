
package com.ecms_web_application.OC01.config;

import com.ecms_web_application.OC01.service.impl.CustomOAuth2UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
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

    public OAuth2Config(CustomOAuth2UserService customOAuth2UserService) {
        this.customOAuth2UserService = customOAuth2UserService;
    }

    /**
     * Cấu hình dịch vụ xử lý người dùng OIDC (OpenID Connect).
     * - OIDC được sử dụng cho Google Sign-In, cung cấp thêm thông tin profile qua id_token.
     * - Dùng OidcUserService chuẩn để load OidcUser và đồng bộ dữ liệu vào DB.
     */
    @Bean
    public OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService() {
        OidcUserService delegate = new OidcUserService();
        return userRequest -> {
            OidcUser oidcUser = delegate.loadUser(userRequest);
            customOAuth2UserService.processUserAttributes(
                    userRequest.getClientRegistration().getRegistrationId(),
                    oidcUser.getAttributes()
            );
            return oidcUser;
        };
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
