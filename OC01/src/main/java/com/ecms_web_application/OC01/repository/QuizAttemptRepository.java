package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.course.QuizAttempt;
import com.ecms_web_application.OC01.entity.enums.QuizAttemptStatus;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAttemptRepository extends IRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByResource_IdAndEnrollment_IdOrderByAttemptNumberDesc(Long resourceId, Long enrollmentId);
    long countByResource_IdAndEnrollment_Id(Long resourceId, Long enrollmentId);

    @Query("SELECT COALESCE(MAX(a.attemptNumber), 0) FROM QuizAttempt a " +
            "WHERE a.resource.id = :resourceId AND a.enrollment.id = :enrollmentId")
    Integer maxAttemptNumber(@Param("resourceId") Long resourceId, @Param("enrollmentId") Long enrollmentId);

    @Query("SELECT a FROM QuizAttempt a WHERE a.resource.id = :resourceId " +
            "AND a.enrollment.id = :enrollmentId AND a.isPassed = true ORDER BY a.attemptNumber DESC")
    List<QuizAttempt> findPassedAttempts(@Param("resourceId") Long resourceId, @Param("enrollmentId") Long enrollmentId);

    Optional<QuizAttempt> findFirstByResource_IdAndEnrollment_IdOrderByAttemptNumberDesc(Long resourceId, Long enrollmentId);

    List<QuizAttempt> findByEnrollment_Id(Long enrollmentId);

    // ============================================================
    // [M9] Scheduler — tìm QUIZ_ATTEMPT hết giờ (IN_PROGRESS + đã quá cutoff)
    // ============================================================
    @Query("""
        SELECT a FROM QuizAttempt a
        JOIN FETCH a.resource r
        WHERE a.status = :status
          AND r.timeLimit IS NOT NULL
          AND r.timeLimit > 0
          AND a.startedAt <= :cutoff
    """)
    List<QuizAttempt> findExpiredCandidates(
            @Param("status") QuizAttemptStatus status,
            @Param("cutoff") LocalDateTime cutoff);
}