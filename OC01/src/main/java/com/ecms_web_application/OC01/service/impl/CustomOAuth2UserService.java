package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.UserProfile;
import com.ecms_web_application.OC01.entity.enums.AuthProvider;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * OAuth2 login:
 * - Account chưa tồn tại → tạo mới với role CUSTOMER (KHÔNG gán permission)
 * - Account đã tồn tại → cập nhật provider info + lastLoginAt
 *
 * Admin sẽ gán permission thủ công sau khi cần.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final UserProfileRepository userProfileRepository;

    private static final String DEFAULT_ROLE = "CUSTOMER";

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = mapToProvider(registrationId);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String providerId = extractProviderId(attributes);
        String email = (String) attributes.getOrDefault(
                "email",
                provider.name().toLowerCase() + "_" + providerId + "@generated.com"
        );
        String name = (String) attributes.getOrDefault("name", email);
        String picture = (String) attributes.get("picture");

        accountRepository.findByEmail(email.toLowerCase())
                .map(existing -> updateExistingAccount(existing, provider, providerId, name, picture))
                .orElseGet(() -> createNewAccount(email.toLowerCase(), name, picture, provider, providerId));

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                attributes,
                "email"
        );
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private AuthProvider mapToProvider(String registrationId) {
        return switch (registrationId.toLowerCase()) {
            case "google"   -> AuthProvider.GOOGLE;
            case "facebook" -> AuthProvider.FACEBOOK;
            case "apple"    -> AuthProvider.APPLE;
            default -> throw new IllegalArgumentException("OAuth2 provider không hỗ trợ: " + registrationId);
        };
    }

    private String extractProviderId(Map<String, Object> attributes) {
        Object id = attributes.get("sub");
        if (id == null) id = attributes.get("id");
        return id != null ? id.toString() : null;
    }

    private Account updateExistingAccount(Account account, AuthProvider provider,
                                          String providerId, String name, String picture) {
        boolean changed = false;

        if (providerId != null && !providerId.equals(account.getProviderId())) {
            account.setProviderId(providerId);
            changed = true;
        }
        if (account.getProvider() == AuthProvider.LOCAL || account.getProvider() != provider) {
            account.setProvider(provider);
            changed = true;
        }
        account.setLastLoginAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        if (changed) accountRepository.save(account);

        UserProfile profile = account.getUserProfile();
        if (profile != null) {
            boolean profileChanged = false;
            if (name != null && !name.equals(profile.getFullName())) {
                profile.setFullName(name);
                profileChanged = true;
            }
            if (picture != null && !picture.equals(profile.getAvatarUrl())) {
                profile.setAvatarUrl(picture);
                profileChanged = true;
            }
            if (profileChanged) {
                profile.setUpdatedAt(LocalDateTime.now());
                userProfileRepository.save(profile);
            }
        }

        log.info("OAuth2 login — account hiện có: {}", account.getEmail());
        return account;
    }

    private Account createNewAccount(String email, String name, String picture,
                                     AuthProvider provider, String providerId) {
        Role role = roleRepository.findByCode(DEFAULT_ROLE)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Role " + DEFAULT_ROLE + " không tồn tại"));

        LocalDateTime now = LocalDateTime.now();

        Account account = new Account();
        account.setEmail(email);
        account.setProvider(provider);
        account.setProviderId(providerId);
        account.setRole(role);
        account.setEmailVerifiedAt(now);
        account.setIsActive(true);
        account.setIsLocked(false);
        account.setFailedLoginCount(0);
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        account.setLastLoginAt(now);
        accountRepository.save(account);

        UserProfile profile = new UserProfile();
        profile.setAccount(account);
        profile.setFullName(name != null ? name : email);
        profile.setAvatarUrl(picture);
        profile.setCreatedAt(now);
        profile.setUpdatedAt(now);
        userProfileRepository.save(profile);

        account.setUserProfile(profile);

        log.info("OAuth2 login — tạo account mới: {} (role={})", email, DEFAULT_ROLE);
        return account;
    }
}