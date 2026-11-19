package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class CourseGradeApprovalHandler implements RequestHandler {

    /** Các field của payload được chuyển sang responseData khi duyệt để lưu bản chốt. */
    private static final List<String> PUBLISHED_FIELDS = List.of(
            "courseId", "courseCode", "courseTitle", "submittedAt", "submittedByName",
            "passScore", "maxFinalScore", "maxAbsencePercent", "totalStudents",
            "passedCount", "failedCount", "noScoreCount", "grades");

    private final CourseRepository courseRepository;

    @Override
    public RequestType supportedType() {
        return RequestType.COURSE_GRADE_APPROVAL;
    }

    @Override
    public void validateCreate(RequestCreateRequest req, RequestType type) {
        if (req.getTargetEntityId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu ID khóa học cần duyệt bảng điểm");
        }
        Course course = courseRepository.findById(req.getTargetEntityId())
                .filter(x -> x.getDeletedAt() == null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học"));
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Phê duyệt bảng điểm chỉ áp dụng cho khóa OFFLINE");
        }
    }

    @Override
    public void onApprove(Request request, RequestReviewRequest review) {
        // Chốt bảng điểm: sao lưu nguyên snapshot điểm đã duyệt vào responseData.
        Map<String, Object> data = new HashMap<>();
        if (request.getResponseData() != null) {
            data.putAll(request.getResponseData());
        }
        Map<String, Object> payload = request.getPayload();
        if (payload != null) {
            for (String field : PUBLISHED_FIELDS) {
                if (payload.get(field) != null) {
                    data.put(field, payload.get(field));
                }
            }
        }
        data.put("published", true);
        data.put("publishedAt", LocalDateTime.now().toString());
        if (review.getNote() != null && !review.getNote().isBlank()) {
            data.put("note", review.getNote().trim());
        }
        request.setResponseData(data);
        log.info("[CourseGradeApprovalHandler] Đã duyệt và công bố bảng điểm cho khóa học ID: {}",
                request.getTargetEntityId());
    }

    @Override
    public void onReject(Request request, RequestReviewRequest review) {
        log.info("[CourseGradeApprovalHandler] Từ chối bảng điểm cho khóa học ID: {}, lý do: {}",
                request.getTargetEntityId(), review.getNote());
    }
}
