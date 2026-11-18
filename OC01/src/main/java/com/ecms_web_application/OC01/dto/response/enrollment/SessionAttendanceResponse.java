package com.ecms_web_application.OC01.dto.response.enrollment;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Danh sách điểm danh của một buổi học.
 *
 * <p>{@code editable} phản ánh quyền chỉnh sửa của người đang đăng nhập tại thời điểm
 * trả dữ liệu (giảng viên bị khóa sau thời hạn cấu hình, ADMIN luôn được sửa).
 * {@code records} có thể chứa các bản ghi "ảo" (attendanceId = null) cho học viên
 * chưa được điểm danh — GET không còn tạo bản ghi trong database.</p>
 */
public record SessionAttendanceResponse(
        Long courseId,
        Long sessionId,
        boolean editable,
        String lockReason,
        LocalDateTime editDeadline,
        List<AttendanceRecordResponse> records
) { }
