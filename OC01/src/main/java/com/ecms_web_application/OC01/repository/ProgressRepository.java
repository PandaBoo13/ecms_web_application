package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Progress;
import com.ecms_web_application.OC01.entity.enums.ProgressScope;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;

@Repository
public interface ProgressRepository extends IRepository<Progress, Long> {

    Optional<Progress> findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
            Long accountId, Long courseId, ProgressScope type, Long referenceId);

    List<Progress> findByAccount_IdAndCourse_Id(Long accountId, Long courseId);
    List<Progress> findByAccount_IdAndCourse_IdAndProgressType(
            Long accountId, Long courseId, ProgressScope type);

    long countByCourse_IdAndProgressType(Long courseId, ProgressScope type);
    List<Progress> findByCourse_IdAndProgressType(Long courseId, ProgressScope type);

    @Query("""
        SELECT p FROM Progress p LEFT JOIN FETCH p.course c
        WHERE p.account.id = :accountId AND p.progressType = 'COURSE'
        ORDER BY p.lastAccessedAt DESC NULLS LAST
    """)
    Page<Progress> findCourseProgressByAccount(@Param("accountId") Long accountId, Pageable pageable);

    @Query("""
        SELECT p FROM Progress p
        WHERE p.course.id = :courseId
          AND p.progressType = com.ecms_web_application.OC01.entity.enums.ProgressScope.COURSE
          AND p.progressPercentage >= 100
    """)
    List<Progress> findCompletedCourseProgresses(@Param("courseId") Long courseId);

    @Modifying
    @Query("""
        UPDATE Progress p
        SET p.hasUncompletedNewContent = true
        WHERE p.course.id = :courseId
          AND p.progressType = com.ecms_web_application.OC01.entity.enums.ProgressScope.COURSE
          AND p.progressPercentage >= 100
    """)
    int markHasUncompletedNewContent(@Param("courseId") Long courseId);
}