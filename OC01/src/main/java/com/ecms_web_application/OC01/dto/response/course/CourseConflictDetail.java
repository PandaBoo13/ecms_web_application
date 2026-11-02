package com.ecms_web_application.OC01.dto.response.course;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Chi tiết 1 conflict giữa course đang xét với course OFFLINE active khác.
 * Dùng để hiển thị rõ: conflict với course nào, GV nào, phòng nào, buổi nào.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseConflictDetail {

    // ── Course conflict ──
    private Long conflictingCourseId;
    private String conflictingCourseTitle;
    private String conflictingCourseStatus;

    // ── Lịch của course conflict ──
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Integer> scheduleDays;
    private LocalTime sessionStartTime;
    private LocalTime sessionEndTime;

    // ── Session cụ thể (chỉ có ở tầng 2 — finalize) ──
    private Long conflictingSessionId;
    private Integer conflictingSessionNumber;
    private LocalDateTime conflictingSessionStart;
    private LocalDateTime conflictingSessionEnd;

    // ── Loại conflict: TEACHER | ROOM (có thể cả 2) ──
    @Builder.Default
    private List<String> conflictTypes = new ArrayList<>();

    // ── Chi tiết GV/Phòng trùng ──
    private Long conflictingTeacherId;
    private String conflictingTeacherName;
    private Long conflictingRoomId;
    private String conflictingRoomName;
}