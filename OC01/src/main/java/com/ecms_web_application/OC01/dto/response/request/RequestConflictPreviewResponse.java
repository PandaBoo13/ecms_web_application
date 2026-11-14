package com.ecms_web_application.OC01.dto.response.request;

import com.ecms_web_application.OC01.dto.response.course.CourseConflictDetail;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Response cho API preview conflict khi duyệt request COURSE_REVIEW.
 * Dùng để FE hiển thị cảnh báo trùng lịch trước khi admin bấm Approve.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestConflictPreviewResponse {

    private Long requestId;

    private Long targetCourseId;
    private String targetCourseTitle;

    private boolean hasConflicts;
    private int conflictCount;

    @Builder.Default
    private List<CourseConflictDetail> conflicts = new ArrayList<>();

    /** Message tóm tắt hiển thị banner FE */
    private String message;
}