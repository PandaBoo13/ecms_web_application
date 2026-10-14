package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.QuizAttempt;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAttemptRepository extends IRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByResource_IdAndAccount_IdOrderByAttemptNumberDesc(Long resourceId, Long accountId);
    long countByResource_IdAndAccount_Id(Long resourceId, Long accountId);

    @Query("SELECT COALESCE(MAX(a.attemptNumber), 0) FROM QuizAttempt a " +
            "WHERE a.resource.id = :resourceId AND a.account.id = :accountId")
    Integer maxAttemptNumber(@Param("resourceId") Long resourceId, @Param("accountId") Long accountId);

    @Query("SELECT a FROM QuizAttempt a WHERE a.resource.id = :resourceId " +
            "AND a.account.id = :accountId AND a.isPassed = true ORDER BY a.attemptNumber DESC")
    List<QuizAttempt> findPassedAttempts(
            @Param("resourceId") Long resourceId, @Param("accountId") Long accountId);

    Optional<QuizAttempt> findFirstByResource_IdAndAccount_IdOrderByAttemptNumberDesc(
            Long resourceId, Long accountId);
}