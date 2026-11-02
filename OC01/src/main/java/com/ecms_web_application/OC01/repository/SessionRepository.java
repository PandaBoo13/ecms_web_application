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

    List<Session> findByCourse_IdOrderBySessionNumberAsc(Long courseId);
    List<Session> findByCourse_IdAndStatus(Long courseId, SessionStatus status);
    long countByCourse_Id(Long courseId);

    @Query("SELECT COALESCE(MAX(s.sessionNumber), 0) FROM Session s WHERE s.course.id = :courseId")
    Integer maxSessionNumber(@Param("courseId") Long courseId);

    @Query("""
        SELECT s FROM Session s
        LEFT JOIN FETCH s.teacher
        LEFT JOIN FETCH s.substituteTeacher
        LEFT JOIN FETCH s.assistant
        LEFT JOIN FETCH s.room
        WHERE s.course.id = :courseId
        ORDER BY s.sessionNumber ASC
    """)
    List<Session> findAllWithDetailsByCourse(@Param("courseId") Long courseId);

    @Query("""
        SELECT s FROM Session s
        WHERE s.course.id = :courseId
          AND s.status = 'SCHEDULED'
          AND s.startTime >= :fromTime
        ORDER BY s.startTime ASC
    """)
    List<Session> findUpcomingSessions(
            @Param("courseId") Long courseId,
            @Param("fromTime") LocalDateTime fromTime);

    // ⚠️ FIX: block SCHEDULED + ONGOING (bỏ 'RESCHEDULED' không tồn tại trong DB)
    @Query("""
        SELECT s FROM Session s
        WHERE s.effectiveTeacherId = :teacherId
          AND s.status IN ('SCHEDULED', 'ONGOING')
          AND s.startTime < :endTime
          AND s.endTime   > :startTime
          AND (:excludeId IS NULL OR s.id <> :excludeId)
    """)
    List<Session> findTeacherConflicts(
            @Param("teacherId") Long teacherId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime")   LocalDateTime endTime,
            @Param("excludeId") Long excludeId);

    // ⚠️ FIX: block SCHEDULED + ONGOING
    @Query("""
        SELECT s FROM Session s
        WHERE s.effectiveRoomId = :roomId
          AND s.status IN ('SCHEDULED', 'ONGOING')
          AND s.startTime < :endTime
          AND s.endTime   > :startTime
          AND (:excludeId IS NULL OR s.id <> :excludeId)
    """)
    List<Session> findRoomConflicts(
            @Param("roomId")    Long roomId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime")   LocalDateTime endTime,
            @Param("excludeId") Long excludeId);

    List<Session> findBySubstituteTeacher_IdAndStatusIn(
            Long substituteTeacherId, Collection<SessionStatus> statuses);

    // ⚠️ FIX: SCHEDULED + ONGOING
    @Query("""
        SELECT s FROM Session s
        WHERE s.effectiveTeacherId = :teacherId
          AND s.sessionDate BETWEEN :from AND :to
          AND s.status IN ('SCHEDULED', 'ONGOING')
        ORDER BY s.startTime ASC
    """)
    List<Session> findTeachingSchedule(
            @Param("teacherId") Long teacherId,
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to);

    // ⚠️ FIX: SCHEDULED + ONGOING
    @Query("""
        SELECT s FROM Session s
        WHERE s.effectiveRoomId = :roomId
          AND s.sessionDate BETWEEN :from AND :to
          AND s.status IN ('SCHEDULED', 'ONGOING')
        ORDER BY s.startTime ASC
    """)
    List<Session> findRoomBusySchedule(
            @Param("roomId") Long roomId,
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to);

    @Query("""
        SELECT s FROM Session s
        WHERE s.course.id = :courseId
          AND s.status = 'SCHEDULED'
          AND s.substituteTeacher IS NULL
    """)
    List<Session> findScheduledSessionsWithoutSubstitute(@Param("courseId") Long courseId);

    // ⚠️ FIX: DRAFT không tính vào "số buổi cần dạy"
    @Query("SELECT COUNT(s) FROM Session s WHERE s.course.id = :courseId " +
            "AND s.status <> 'CANCELLED' AND s.status <> 'DRAFT'")
    long countActiveSessions(@Param("courseId") Long courseId);

    // ⚠️ FIX: 'DONE' → 'COMPLETED'
    @Query("SELECT COUNT(s) FROM Session s WHERE s.course.id = :courseId AND s.status = 'COMPLETED'")
    long countDoneSessions(@Param("courseId") Long courseId);
}