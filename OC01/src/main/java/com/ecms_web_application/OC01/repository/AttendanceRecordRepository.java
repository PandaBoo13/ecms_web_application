package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AttendanceRecord;
import com.ecms_web_application.OC01.entity.enums.AttendanceStatus;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends IRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySessionIdOrderByEnrollmentIdAsc(Long sessionId);
    List<AttendanceRecord> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);
    Optional<AttendanceRecord> findByEnrollmentIdAndSessionId(Long enrollmentId, Long sessionId);
    long countByEnrollmentIdAndStatus(Long enrollmentId, AttendanceStatus status);
}
