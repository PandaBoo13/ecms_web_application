package com.ecms_web_application.OC01.config.security;

import com.ecms_web_application.OC01.config.JwtFilter;
import com.ecms_web_application.OC01.config.OAuth2SuccessHandler;
import com.ecms_web_application.OC01.service.AuthenticationService;
import com.ecms_web_application.OC01.service.impl.CustomOAuth2UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;


import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfiguration {

    private final JwtFilter jwtFilter;
    private final PermissionAuthorizationFilter permissionAuthorizationFilter;
    private final AuthenticationService authenticationService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;   // 🆕

    public SecurityConfiguration(
            @Lazy JwtFilter jwtFilter,
            @Lazy PermissionAuthorizationFilter permissionAuthorizationFilter,
            @Lazy AuthenticationService authenticationService,
            CustomOAuth2UserService customOAuth2UserService,
         OAuth2SuccessHandler oAuth2SuccessHandler) {       // 🆕
        this.jwtFilter = jwtFilter;
        this.permissionAuthorizationFilter = permissionAuthorizationFilter;
        this.authenticationService = authenticationService;
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;   // 🆕
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
        return httpSecurity
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ⚠️ Mọi authorization do PermissionAuthorizationFilter xử lý
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().permitAll()
                )

                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)          // 🆕 CHÌA KHÓA
                )

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authenticationProvider(authenticationProvider())

                // ── Filter chain (thứ tự thực thi) ──
                //
                //  [1] JwtFilter                          (order ~1849)
                //      → parse token, set SecurityContext
                //
                //  [2] UsernamePasswordAuthenticationFilter (order 1850, của Spring)
                //
                //  [3] PermissionAuthorizationFilter      (order ~1851)
                //      → check phân quyền
                //
                // ⚠️ Không dùng `.addFilterAfter(perm, JwtFilter.class)` vì JwtFilter
                //    là custom filter, Spring Security KHÔNG có order đăng ký cho nó.
                //    Phải dùng mốc chuẩn: UsernamePasswordAuthenticationFilter.
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(permissionAuthorizationFilter, UsernamePasswordAuthenticationFilter.class)

                .build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider();
        authenticationProvider.setUserDetailsService(authenticationService);
        authenticationProvider.setPasswordEncoder(passwordEncoder());
        return authenticationProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://192.168.*.*:*",
                "exp://79.79.*.*:*",
                "http://10.*.*.*:*",
                "https://*"
        ));
        corsConfiguration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"
        ));
        corsConfiguration.setAllowedHeaders(List.of("*"));
        corsConfiguration.setExposedHeaders(List.of(
                "Authorization", "Set-Cookie", "Content-Type"
        ));
        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }

    @Bean
    public OidcUserService oidcUserService1() {
        return new OidcUserService();
    }

    @Bean
    public DefaultOAuth2UserService oAuth2UserService1() {
        return new DefaultOAuth2UserService();
    }
}