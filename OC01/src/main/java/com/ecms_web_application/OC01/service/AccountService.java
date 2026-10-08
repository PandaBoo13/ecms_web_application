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
}