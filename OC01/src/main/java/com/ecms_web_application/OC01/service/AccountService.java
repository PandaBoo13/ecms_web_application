package com.ecms_web_application.OC01.service;

import org.springframework.security.core.userdetails.UserDetailsService;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.generic.IRepository;

import java.util.Iterator;

/**
 * Service quản lý Account cơ bản.
 * Extends UserDetailsService để hỗ trợ Spring Security.
 */
public interface AccountService extends UserDetailsService {

    void save(Account account);

    void delete(Long id);

    Iterator<Account> findAll();

    Account findOne(Long id);

    IRepository<Account, Long> getRepository();

    void lockAccount(Long id, String reason);

    /** Admin khóa có thời hạn. */
    void lockAccountTemporarily(Long id, int minutes, String reason);

    /** Admin mở khóa (dùng cho cả lock vĩnh viễn và lock tạm). */
    void unlockAccount(Long id);

    /** Gọi khi đăng nhập sai. */
    void recordFailedLogin(String email);

    /** Gọi khi đăng nhập thành công. */
    void recordSuccessfulLogin(Long id, String ip);
}