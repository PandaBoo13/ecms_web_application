package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AttendanceRecord;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.generic.IRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends IRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySessionIdOrderByEnrollmentIdAsc(Long sessionId);
    List<AttendanceRecord> findBySessionIdInOrderByEnrollmentIdAsc(Collection<Long> sessionIds);
    List<AttendanceRecord> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);
    List<AttendanceRecord> findByEnrollmentIdAndSessionIdIn(Long enrollmentId, Collection<Long> sessionIds);
    Optional<AttendanceRecord> findByEnrollmentIdAndSessionId(Long enrollmentId, Long sessionId);

    /**
     * Đếm buổi vắng theo đúng phạm vi ngưỡng xét hoàn thành: buổi đã kết thúc, không hủy/nháp,
     * và học viên thực sự thuộc diện buổi đó (ghi danh trước khi buổi kết thúc, không bảo lưu).
     */
    @Query("""
        SELECT COUNT(a) FROM AttendanceRecord a, Session s, Enrollment e
        WHERE a.enrollmentId = :enrollmentId
          AND a.status = com.ecms_web_application.OC01.entity.enums.AttendanceStatus.ABSENT
          AND s.id = a.sessionId
          AND s.course.id = :courseId
          AND s.status <> com.ecms_web_application.OC01.entity.enums.SessionStatus.CANCELLED
          AND s.status <> com.ecms_web_application.OC01.entity.enums.SessionStatus.DRAFT
          AND s.endTime IS NOT NULL
          AND s.endTime <= :now
          AND e.id = a.enrollmentId
          AND (e.enrolledAt IS NULL OR e.enrolledAt <= s.endTime)
          AND (e.holdStartDate IS NULL OR e.holdEndDate IS NULL
               OR s.sessionDate IS NULL
               OR s.sessionDate < e.holdStartDate OR s.sessionDate > e.holdEndDate)
    """)
    long countThresholdAbsences(@Param("enrollmentId") Long enrollmentId,
                               @Param("courseId") Long courseId,
                               @Param("now") LocalDateTime now);

    /** Số học viên ACTIVE còn buổi chưa điểm danh (đúng phạm vi ngưỡng) — chặn duyệt bảng điểm. */
    @Query("""
        SELECT COUNT(e) FROM Enrollment e
        WHERE e.courseId = :courseId
          AND e.status = :activeStatus
          AND EXISTS (
              SELECT s FROM Session s
              WHERE s.course.id = :courseId
                AND s.status <> com.ecms_web_application.OC01.entity.enums.SessionStatus.CANCELLED
                AND s.status <> com.ecms_web_application.OC01.entity.enums.SessionStatus.DRAFT
                AND s.endTime IS NOT NULL
                AND s.endTime <= :now
                AND (e.enrolledAt IS NULL OR e.enrolledAt <= s.endTime)
                AND NOT (e.holdStartDate IS NOT NULL AND e.holdEndDate IS NOT NULL
                         AND s.sessionDate IS NOT NULL
                         AND s.sessionDate >= e.holdStartDate AND s.sessionDate <= e.holdEndDate)
                AND NOT EXISTS (
                    SELECT a FROM AttendanceRecord a
                    WHERE a.enrollmentId = e.id
                      AND a.sessionId = s.id
                      AND a.status <> com.ecms_web_application.OC01.entity.enums.AttendanceStatus.NOT_MARKED
                )
          )
    """)
    long countActiveEnrollmentsWithUnmarkedSessions(@Param("courseId") Long courseId,
                                                    @Param("activeStatus") EnrollmentStatus activeStatus,
                                                    @Param("now") LocalDateTime now);

    /** Khóa bản ghi điểm danh khi duyệt/từ chối/thu hồi đơn nghỉ để tránh race với điểm danh thủ công. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AttendanceRecord a WHERE a.enrollmentId = :enrollmentId AND a.sessionId = :sessionId")
    Optional<AttendanceRecord> findByEnrollmentIdAndSessionIdForUpdate(
            @Param("enrollmentId") Long enrollmentId,
            @Param("sessionId") Long sessionId);
}
