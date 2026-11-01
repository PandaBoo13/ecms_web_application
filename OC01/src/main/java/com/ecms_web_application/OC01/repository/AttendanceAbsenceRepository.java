package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AttendanceAbsence;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceAbsenceRepository extends IRepository<AttendanceAbsence, Long> {
    List<AttendanceAbsence> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
    List<AttendanceAbsence> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);
    Optional<AttendanceAbsence> findByEnrollmentIdAndSessionId(Long enrollmentId, Long sessionId);
    long countByEnrollmentId(Long enrollmentId);
}
