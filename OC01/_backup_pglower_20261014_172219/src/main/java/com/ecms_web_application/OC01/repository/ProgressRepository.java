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

@Repository
public interface ProgressRepository extends IRepository<Progress, Long> {

    Optional<Progress> findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
            Long accountId, Long courseId, ProgressScope type, Long referenceId);

    List<Progress> findByAccount_IdAndCourse_Id(Long accountId, Long courseId);
    List<Progress> findByAccount_IdAndCourse_IdAndProgressType(
            Long accountId, Long courseId, ProgressScope type);

    long countByCourse_IdAndProgressType(Long courseId, ProgressScope type);

    @Query("""
        SELECT p FROM Progress p LEFT JOIN FETCH p.course c
        WHERE p.account.id = :accountId AND p.progressType = 'COURSE'
        ORDER BY p.lastAccessedAt DESC NULLS LAST
    """)
    Page<Progress> findCourseProgressByAccount(@Param("accountId") Long accountId, Pageable pageable);
}