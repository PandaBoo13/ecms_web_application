package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.EnrollmentStatusLog;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentStatusLogRepository extends IRepository<EnrollmentStatusLog, Long> {
    List<EnrollmentStatusLog> findByEnrollmentIdOrderByChangedAtDesc(Long enrollmentId);
}
