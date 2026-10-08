package com.ecms_web_application.OC01.service.impl;

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
}