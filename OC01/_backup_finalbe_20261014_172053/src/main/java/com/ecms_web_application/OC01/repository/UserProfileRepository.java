package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.UserProfile;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends IRepository<UserProfile, Long> {

    // Tìm theo account_id (quan hệ 1-1)
    Optional<UserProfile> findByAccountId(Long accountId);

    // Tìm theo phone
    Optional<UserProfile> findByPhone(String phone);

    // Load kèm Account (tránh LazyInitializationException khi cần)
    @Query("""
        SELECT p FROM UserProfile p
        JOIN FETCH p.account a
        WHERE p.account.id = :accountId
    """)
    Optional<UserProfile> findByAccountIdWithAccount(@Param("accountId") Long accountId);

    // Check trùng phone nhưng trừ account hiện tại
    boolean existsByPhoneAndAccountIdNot(String phone, Long accountId);

    // Đếm GV đã verify
    long countByIsVerifiedTrue();
}