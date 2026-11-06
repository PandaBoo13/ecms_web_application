package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.response.course.CourseConflictDetail;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.service.CourseConflictService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseConflictServiceImpl implements CourseConflictService {

    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;

    // ============================================================
    // TẦNG 1 — Course-level check (dùng ở onApprove + preview)
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public List<CourseConflictDetail> checkCourseConflict(Course course) {

        // ONLINE không có lịch cụ thể → không conflict
        if (course.getCourseType() != CourseType.OFFLINE) return List.of();

        // Thiếu config lịch → không thể check
        if (!hasFullSchedule(course)) return List.of();

        Set<Long> myRooms = roomsOf(course);
        Long myTeacherId = course.getTeacher() != null
                ? course.getTeacher().getId() : null;

        // Không có GV và cũng không có phòng → không thể conflict
        if (myTeacherId == null && myRooms.isEmpty()) return List.of();

        // Query 1 lần tất cả course active overlap ngày → filter Java cho GV/phòng
        List<Course> candidates = courseRepository.findAllOverlappingOfflineCourses(
                course.getId(), course.getStartDate(), course.getEndDate());

        List<CourseConflictDetail> conflicts = new ArrayList<>();

        for (Course y : candidates) {
            // Check thứ + giờ overlap
            if (!scheduleOverlap(course, y)) continue;

            List<String> types = new ArrayList<>();

            // ── Check GV ──
            Long yTeacherId = y.getTeacher() != null
                    ? y.getTeacher().getId() : null;
            if (myTeacherId != null && myTeacherId.equals(yTeacherId)) {
                types.add("TEACHER");
            }

            // ── Check phòng (giao tập phòng ≠ ∅) ──
            Set<Long> yRooms = roomsOf(y);
            Set<Long> intersect = new HashSet<>(myRooms);
            intersect.retainAll(yRooms);
            if (!intersect.isEmpty()) {
                types.add("ROOM");
            }

            if (!types.isEmpty()) {
                conflicts.add(buildCourseDetail(y, types));
            }
        }

        log.info("[ConflictCheck-T1] Course {} — phát hiện {} conflict",
                course.getId(), conflicts.size());
        return conflicts;
    }

    // ============================================================
    // TẦNG 2 — Session-level check (dùng ở finalizeSchedule)
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public List<CourseConflictDetail> checkSessionConflict(Long courseId) {

        List<Session> sessions = sessionRepository
                .findByCourse_IdOrderBySessionNumberAsc(courseId);

        if (sessions.isEmpty()) return List.of();

        List<CourseConflictDetail> conflicts = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (Session s : sessions) {
            if (s.getStatus() == SessionStatus.CANCELLED) continue;

            Long teacherId = s.getEffectiveTeacherId();
            Long roomId = s.getEffectiveRoomId();

            // ── Check GV ──
            if (teacherId != null) {
                List<Session> teacherConf = sessionRepository.findTeacherConflicts(
                        teacherId, s.getStartTime(), s.getEndTime(), s.getId());
                for (Session other : teacherConf) {
                    if (other.getCourse() != null
                            && Objects.equals(other.getCourse().getId(), courseId)) continue;

                    String key = s.getId() + ":" + other.getId() + ":TEACHER";
                    if (seen.add(key)) {
                        conflicts.add(buildSessionDetail(other, "TEACHER"));
                    }
                }
            }

            // ── Check phòng ──
            if (roomId != null) {
                List<Session> roomConf = sessionRepository.findRoomConflicts(
                        roomId, s.getStartTime(), s.getEndTime(), s.getId());
                for (Session other : roomConf) {
                    if (other.getCourse() != null
                            && Objects.equals(other.getCourse().getId(), courseId)) continue;

                    String key = s.getId() + ":" + other.getId() + ":ROOM";
                    if (seen.add(key)) {
                        conflicts.add(buildSessionDetail(other, "ROOM"));
                    }
                }
            }
        }

        log.info("[ConflictCheck-T2] Course {} sessions — phát hiện {} conflict",
                courseId, conflicts.size());
        return conflicts;
    }

    // ============================================================
    // HELPERS
    // ============================================================

    /**
     * Tập phòng của course:
     *  - Có room_id cụ thể  → { room_id }
     *  - Có allowed_room_ids → set(allowed_room_ids)
     *  - Không có gì         → ∅
     */
    private Set<Long> roomsOf(Course c) {
        if (c.getRoom() != null && c.getRoom().getId() != null) {
            return Set.of(c.getRoom().getId());
        }
        if (c.getAllowedRoomIds() != null && !c.getAllowedRoomIds().isEmpty()) {
            return new HashSet<>(c.getAllowedRoomIds());
        }
        return Set.of();
    }

    /** Có đủ config lịch để check conflict không. */
    private boolean hasFullSchedule(Course c) {
        return c.getStartDate() != null
                && c.getEndDate() != null
                && c.getScheduleDays() != null && !c.getScheduleDays().isEmpty()
                && c.getSessionStartTime() != null
                && c.getSessionEndTime() != null;
    }

    /** Overlap về lịch giữa 2 course (schedule_days + session_time). */
    private boolean scheduleOverlap(Course a, Course b) {
        if (a.getScheduleDays() == null || b.getScheduleDays() == null) return false;

        // ① Có ít nhất 1 thứ chung
        Set<Integer> common = new HashSet<>(a.getScheduleDays());
        common.retainAll(b.getScheduleDays());
        if (common.isEmpty()) return false;

        // ② session_time overlap
        LocalTime aStart = a.getSessionStartTime(), aEnd = a.getSessionEndTime();
        LocalTime bStart = b.getSessionStartTime(), bEnd = b.getSessionEndTime();
        if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;

        return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
    }

    /** Build detail cho tầng 1 (course-level). */
    private CourseConflictDetail buildCourseDetail(Course y, List<String> types) {
        CourseConflictDetail d = CourseConflictDetail.builder()
                .conflictingCourseId(y.getId())
                .conflictingCourseTitle(y.getTitle())
                .conflictingCourseStatus(y.getStatus() != null ? y.getStatus().name() : null)
                .startDate(y.getStartDate())
                .endDate(y.getEndDate())
                .scheduleDays(y.getScheduleDays())
                .sessionStartTime(y.getSessionStartTime())
                .sessionEndTime(y.getSessionEndTime())
                .conflictTypes(types)
                .build();

        if (y.getTeacher() != null) {
            d.setConflictingTeacherId(y.getTeacher().getId());
            d.setConflictingTeacherName(fullNameOf(y.getTeacher()));
        }
        if (y.getRoom() != null) {
            d.setConflictingRoomId(y.getRoom().getId());
            d.setConflictingRoomName(y.getRoom().getName());
        } else if (y.getAllowedRoomIds() != null && !y.getAllowedRoomIds().isEmpty()) {
            // Không có phòng cụ thể, dùng allowed → hiển thị danh sách ID
            d.setConflictingRoomName("(Cho phép: " + y.getAllowedRoomIds() + ")");
        }
        return d;
    }

    /** Build detail cho tầng 2 (session-level). */
    private CourseConflictDetail buildSessionDetail(Session other, String type) {
        Course y = other.getCourse();
        CourseConflictDetail d = CourseConflictDetail.builder()
                .conflictingCourseId(y != null ? y.getId() : null)
                .conflictingCourseTitle(y != null ? y.getTitle() : null)
                .conflictingCourseStatus(y != null && y.getStatus() != null
                        ? y.getStatus().name() : null)
                .startDate(y != null ? y.getStartDate() : null)
                .endDate(y != null ? y.getEndDate() : null)
                .scheduleDays(y != null ? y.getScheduleDays() : null)
                .sessionStartTime(y != null ? y.getSessionStartTime() : null)
                .sessionEndTime(y != null ? y.getSessionEndTime() : null)
                .conflictingSessionId(other.getId())
                .conflictingSessionNumber(other.getSessionNumber())
                .conflictingSessionStart(other.getStartTime())
                .conflictingSessionEnd(other.getEndTime())
                .conflictTypes(new ArrayList<>(List.of(type)))
                .build();

        if (other.getTeacher() != null) {
            d.setConflictingTeacherId(other.getTeacher().getId());
            d.setConflictingTeacherName(fullNameOf(other.getTeacher()));
        }
        if (other.getRoom() != null) {
            d.setConflictingRoomId(other.getRoom().getId());
            d.setConflictingRoomName(other.getRoom().getName());
        }
        return d;
    }

    private static String fullNameOf(Account a) {
        if (a == null) return null;
        return a.getUserProfile() != null ? a.getUserProfile().getFullName() : a.getEmail();
    }
}