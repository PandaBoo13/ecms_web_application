// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/repository/SessionRepository.java
// (giữ nguyên toàn bộ method cũ — CHỈ thêm 2 method dưới đây)
// ============================================================
package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface SessionRepository extends IRepository<Session, Long> {

    // ════════════════════════════════════════════════════════════
    // (CÁC METHOD CŨ — GIỮ NGUYÊN, KHÔNG SỬA)
    // ============================================================
    // findByCourse_IdOrderBySessionNumberAsc, findByCourse_IdAndStatus,
    // countByCourse_Id, maxSessionNumber, findAllWithDetailsByCourse,
    // findUpcomingSessions, findTeacherConflicts, findRoomConflicts,
    // findTeacherConflictsExcludingCourse, findRoomConflictsExcludingCourse,
    // findBySubstituteTeacher_IdAndStatusIn, findTeachingSchedule,
    // findRoomBusySchedule, findScheduledSessionsWithoutSubstitute,
    // countActiveSessions, countDoneSessions, findInstructorScheduleWithCourse,
    // findStudentScheduleWithCourse, findScheduledToStart, findOngoingToComplete
    // ════════════════════════════════════════════════════════════

    List<Session> findByCourse_IdOrderBySessionNumberAsc(Long courseId);
    List<Session> findByCourse_IdAndStatus(Long courseId, SessionStatus status);
    long countByCourse_Id(Long courseId);

    @Query("SELECT COALESCE(MAX(s.sessionNumber), 0) FROM Session s WHERE s.course.id = :courseId")
    Integer maxSessionNumber(@Param("courseId") Long courseId);

    @Query("SELECT s FROM Session s LEFT JOIN FETCH s.teacher LEFT JOIN FETCH s.substituteTeacher LEFT JOIN FETCH s.assistant LEFT JOIN FETCH s.room WHERE s.course.id = :courseId ORDER BY s.sessionNumber ASC")
    List<Session> findAllWithDetailsByCourse(@Param("courseId") Long courseId);

    @Query("SELECT s FROM Session s WHERE s.course.id = :courseId AND s.status = 'SCHEDULED' AND s.startTime >= :fromTime ORDER BY s.startTime ASC")
    List<Session> findUpcomingSessions(@Param("courseId") Long courseId, @Param("fromTime") LocalDateTime fromTime);

    @Query("SELECT s FROM Session s WHERE s.effectiveTeacherId = :teacherId AND s.status IN ('DRAFT', 'SCHEDULED', 'ONGOING') AND s.startTime < :endTime AND s.endTime > :startTime AND (:excludeId IS NULL OR s.id <> :excludeId)")
    List<Session> findTeacherConflicts(@Param("teacherId") Long teacherId, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, @Param("excludeId") Long excludeId);

    @Query("SELECT s FROM Session s WHERE s.effectiveRoomId = :roomId AND s.status IN ('DRAFT', 'SCHEDULED', 'ONGOING') AND s.startTime < :endTime AND s.endTime > :startTime AND (:excludeId IS NULL OR s.id <> :excludeId)")
    List<Session> findRoomConflicts(@Param("roomId") Long roomId, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, @Param("excludeId") Long excludeId);

    @Query("SELECT s FROM Session s WHERE s.effectiveTeacherId = :teacherId AND s.status IN ('DRAFT', 'SCHEDULED', 'ONGOING') AND s.startTime < :endTime AND s.endTime > :startTime AND s.course.id <> :excludeCourseId")
    List<Session> findTeacherConflictsExcludingCourse(@Param("teacherId") Long teacherId, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, @Param("excludeCourseId") Long excludeCourseId);

    @Query("SELECT s FROM Session s WHERE s.effectiveRoomId = :roomId AND s.status IN ('DRAFT', 'SCHEDULED', 'ONGOING') AND s.startTime < :endTime AND s.endTime > :startTime AND s.course.id <> :excludeCourseId")
    List<Session> findRoomConflictsExcludingCourse(@Param("roomId") Long roomId, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, @Param("excludeCourseId") Long excludeCourseId);

    List<Session> findBySubstituteTeacher_IdAndStatusIn(Long substituteTeacherId, Collection<SessionStatus> statuses);

    @Query("SELECT s FROM Session s WHERE s.effectiveTeacherId = :teacherId AND s.sessionDate BETWEEN :from AND :to AND s.status IN ('SCHEDULED', 'ONGOING') ORDER BY s.startTime ASC")
    List<Session> findTeachingSchedule(@Param("teacherId") Long teacherId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT s FROM Session s WHERE s.effectiveRoomId = :roomId AND s.sessionDate BETWEEN :from AND :to AND s.status IN ('SCHEDULED', 'ONGOING') ORDER BY s.startTime ASC")
    List<Session> findRoomBusySchedule(@Param("roomId") Long roomId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT s FROM Session s WHERE s.course.id = :courseId AND s.status = 'SCHEDULED' AND s.substituteTeacher IS NULL")
    List<Session> findScheduledSessionsWithoutSubstitute(@Param("courseId") Long courseId);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.course.id = :courseId AND s.status <> 'CANCELLED' AND s.status <> 'DRAFT'")
    long countActiveSessions(@Param("courseId") Long courseId);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.course.id = :courseId AND s.status = 'COMPLETED'")
    long countDoneSessions(@Param("courseId") Long courseId);

    @Query("SELECT s FROM Session s JOIN FETCH s.course c WHERE s.effectiveTeacherId = :teacherId AND s.sessionDate BETWEEN :from AND :to AND s.status IN ('SCHEDULED', 'ONGOING') ORDER BY s.startTime ASC")
    List<Session> findInstructorScheduleWithCourse(@Param("teacherId") Long teacherId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
    SELECT DISTINCT s
    FROM Session s
    JOIN FETCH s.course c
    JOIN Enrollment e ON e.courseId = c.id
    JOIN Student st ON st.id = e.studentId
    WHERE st.userId = :accountId
      AND e.status IN ('PENDING', 'ACTIVE', 'RESERVED', 'COMPLETED')
      AND s.sessionDate BETWEEN :from AND :to
      AND s.status IN ('SCHEDULED', 'ONGOING', 'COMPLETED')
    ORDER BY s.startTime ASC
""")
    List<Session> findStudentScheduleWithCourse(
            @Param("accountId") Long accountId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
    @Query("SELECT s FROM Session s JOIN FETCH s.course c WHERE s.status = com.ecms_web_application.OC01.entity.enums.SessionStatus.SCHEDULED AND s.startTime <= :now AND c.status IN (com.ecms_web_application.OC01.entity.enums.CourseStatus.PUBLISHED, com.ecms_web_application.OC01.entity.enums.CourseStatus.ONGOING)")
    List<Session> findScheduledToStart(@Param("now") LocalDateTime now);

    @Query("SELECT s FROM Session s JOIN FETCH s.course c WHERE s.status = com.ecms_web_application.OC01.entity.enums.SessionStatus.ONGOING AND s.endTime <= :now")
    List<Session> findOngoingToComplete(@Param("now") LocalDateTime now);

    // ════════════════════════════════════════════════════════════
    // 🆕 BỔ SUNG — phục vụ availability check theo LocalDateTime
    // ════════════════════════════════════════════════════════════

    /**
     * SESSION đang chiếm ROOM trong khoảng [from, to).
     * Chỉ xét SCHEDULED + ONGOING (bỏ DRAFT/CANCELLED/COMPLETED).
     * Overlap: session.startTime < to AND session.endTime > from.
     */
    @Query("""
        SELECT s FROM Session s
        JOIN FETCH s.course c
        WHERE s.effectiveRoomId = :roomId
          AND s.status IN ('SCHEDULED', 'ONGOING')
          AND s.startTime < :to
          AND s.endTime > :from
        ORDER BY s.startTime ASC
    """)
    List<Session> findRoomBusySessionsInRange(
            @Param("roomId") Long roomId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * SESSION đang chiếm INSTRUCTOR trong khoảng [from, to).
     * Chỉ xét SCHEDULED + ONGOING.
     * Overlap: session.startTime < to AND session.endTime > from.
     */
    @Query("""
        SELECT s FROM Session s
        JOIN FETCH s.course c
        WHERE s.effectiveTeacherId = :teacherId
          AND s.status IN ('SCHEDULED', 'ONGOING')
          AND s.startTime < :to
          AND s.endTime > :from
        ORDER BY s.startTime ASC
    """)
    List<Session> findTeacherBusySessionsInRange(
            @Param("teacherId") Long teacherId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}