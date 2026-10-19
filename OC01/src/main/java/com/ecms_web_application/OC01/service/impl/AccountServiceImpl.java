package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.service.EmailService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.UserProfile;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.GeneralService;
import com.ecms_web_application.OC01.generic.IRepository;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.service.AccountService;

import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final GeneralService generalService;
    private final PasswordEncoder passwordEncoder;
    // Thêm config
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int DEFAULT_LOCK_MINUTES = 30;

    // Inject thêm
    private final EmailService emailService;
    /** ⚠️ ĐỔI: role mặc định STUDENT */
    private static final String DEFAULT_ROLE = "STUDENT";

    @Override
    public void save(Account account) {
        try {
            if (accountRepository.findByEmail(account.getEmail()).isPresent()) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Email already exists.");
            }

            generalService.validatePassword(account.getPasswordHash());

            // ⚠️ SỬA: role = STUDENT
            Role role = roleRepository.findByCode(DEFAULT_ROLE)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.BAD_REQUEST, "Role " + DEFAULT_ROLE + " not found"));

            account.setRole(role);
            account.setPasswordHash(passwordEncoder.encode(account.getPasswordHash()));
            account.setIsActive(true);
            account.setIsLocked(false);
            account.setFailedLoginCount(0);
            account.setCreatedAt(LocalDateTime.now());

            UserProfile userProfile = new UserProfile();
            userProfile.setAccount(account);
            userProfile.setFullName(account.getEmail());
            account.setUserProfile(userProfile);

            accountRepository.save(account);
        } catch (Exception e) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @Override
    public void delete(Long id) {
        // TODO: implement
    }

    @Override
    public Iterator<Account> findAll() {
        return null;
    }

    @Override
    public Account findOne(Long id) {
        return accountRepository.findById(id).orElse(null);
    }

    /**
     * ⚠️ FIX BUG: return type phải là IRepository<Account, Long>, không phải Integer
     * (Vì Account có @Id là Long)
     */
    @Override
    public IRepository<Account, Long> getRepository() {
        return accountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Optional<Account> account = accountRepository.findByEmail(email);
        return account.orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED, "Account not exist"));
    }

    // ==================== LOCK / UNLOCK ====================

    @Override
    @Transactional
    public void lockAccount(Long id, String reason) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));

        if (Boolean.TRUE.equals(acc.getIsLocked()) && acc.getLockedUntil() == null) {
            return; // đã bị khóa vĩnh viễn rồi
        }

        acc.setIsLocked(true);
        acc.setLockedUntil(null); // null = vĩnh viễn
        accountRepository.save(acc);

        sendLockEmail(acc, reason, null);
    }

    @Override
    @Transactional
    public void lockAccountTemporarily(Long id, int minutes, String reason) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));

        acc.setIsLocked(true);
        acc.setLockedUntil(LocalDateTime.now().plusMinutes(Math.max(1, minutes)));
        accountRepository.save(acc);

        sendLockEmail(acc, reason, acc.getLockedUntil());
    }

    @Override
    @Transactional
    public void unlockAccount(Long id) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));

        acc.setIsLocked(false);
        acc.setLockedUntil(null);
        acc.setFailedLoginCount(0);
        accountRepository.save(acc);
    }

// ==================== LOGIN TRACKING ====================

    @Override
    @Transactional
    public void recordFailedLogin(String email) {
        Account acc = accountRepository.findByEmail(email).orElse(null);
        if (acc == null) return;

        int count = acc.getFailedLoginCount() == null ? 0 : acc.getFailedLoginCount();
        count++;
        acc.setFailedLoginCount(count);

        // Chỉ khóa nếu chưa bị khóa và đủ số lần
        if (!Boolean.TRUE.equals(acc.getIsLocked()) && count >= MAX_FAILED_ATTEMPTS) {
            acc.setIsLocked(true);
            acc.setLockedUntil(LocalDateTime.now().plusMinutes(DEFAULT_LOCK_MINUTES));
            accountRepository.save(acc);

            sendLockEmail(acc,
                    "Nhập sai mật khẩu quá " + MAX_FAILED_ATTEMPTS + " lần",
                    acc.getLockedUntil());
            return;
        }
        accountRepository.save(acc);
    }

    @Override
    @Transactional
    public void recordSuccessfulLogin(Long id, String ip) {
        Account acc = accountRepository.findById(id).orElse(null);
        if (acc == null) return;

        // Nếu khóa tạm đã hết hạn → tự mở khóa
        if (Boolean.TRUE.equals(acc.getIsLocked())
                && acc.getLockedUntil() != null
                && LocalDateTime.now().isAfter(acc.getLockedUntil())) {
            acc.setIsLocked(false);
            acc.setLockedUntil(null);
        }

        acc.setFailedLoginCount(0);
        acc.setLastLoginAt(LocalDateTime.now());
        acc.setLastLoginIp(ip);
        accountRepository.save(acc);
    }

// ==================== EMAIL HELPER ====================

    private void sendLockEmail(Account acc, String reason, LocalDateTime until) {
        String fullName = acc.getUserProfile() != null
                ? acc.getUserProfile().getFullName()
                : acc.getEmail();
        emailService.sendAccountLockedEmail(acc.getEmail(), fullName, reason, until);
    }
}