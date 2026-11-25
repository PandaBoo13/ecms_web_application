package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AttendanceRecordRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EnrollmentRepository enrollmentRepository;

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
        if (course.getStatus() != CourseStatus.FINISHED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ gửi duyệt bảng điểm sau khi khóa học kết thúc");
        }
    }

    @Override
    public void onApprove(Request request, RequestReviewRequest review) {
        // Không duyệt khi còn buổi chưa điểm danh: bảng điểm công bố sẽ khóa vĩnh viễn điểm danh,
        // khiến các học viên này không thể được xét hoàn thành.
        Course course = courseRepository.findById(request.getTargetEntityId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học"));
        if (course.getCourseType() == CourseType.OFFLINE) {
            // Duyệt khi khóa chưa kết thúc sẽ khóa vĩnh viễn các buổi còn lại và bảng điểm.
            if (course.getStatus() != CourseStatus.FINISHED) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Chỉ duyệt bảng điểm sau khi khóa học kết thúc");
            }
            // Publish sẽ khóa điểm vĩnh viễn: học viên ACTIVE chưa có điểm sẽ không bao giờ hoàn thành được.
            long missingScores = enrollmentRepository
                    .findByCourseIdAndStatus(course.getId(), EnrollmentStatus.ACTIVE).stream()
                    .filter(e -> e.getFinalScore() == null)
                    .count();
            if (missingScores > 0) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Còn " + missingScores + " học viên chưa có điểm cuối khóa — không thể duyệt bảng điểm. "
                                + "Hãy yêu cầu giảng viên nhập đủ điểm trước khi duyệt.");
            }
            long unmarkedStudents = attendanceRecordRepository
                    .countActiveEnrollmentsWithUnmarkedSessions(course.getId(), EnrollmentStatus.ACTIVE, LocalDateTime.now());
            if (unmarkedStudents > 0) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Còn " + unmarkedStudents + " học viên chưa điểm danh đủ buổi — không thể duyệt bảng điểm. "
                                + "Hãy hoàn tất điểm danh trước khi duyệt.");
            }
            // Snapshot đã gửi duyệt phải khớp danh sách ACTIVE + điểm hiện tại, nếu không bảng
            // công bố sẽ lệch với kết quả thực tế (HV bị terminate/reserve hoặc điểm bị sửa).
            requireSnapshotMatchesCurrentGrades(course, request);
        }

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

    /** So khớp snapshot gửi duyệt với ghi danh ACTIVE + điểm hiện tại trước khi công bố. */
    private void requireSnapshotMatchesCurrentGrades(Course course, Request request) {
        Map<Long, BigDecimal> snapshot = snapshotGrades(request.getPayload());
        if (snapshot == null) {
            // Request cũ không có snapshot điểm thì bỏ qua (các check phía trên vẫn áp dụng).
            return;
        }
        Map<Long, BigDecimal> current = new HashMap<>();
        for (Enrollment enrollment : enrollmentRepository
                .findByCourseIdAndStatus(course.getId(), EnrollmentStatus.ACTIVE)) {
            if (enrollment.getFinalScore() != null) {
                current.put(enrollment.getId(), enrollment.getFinalScore());
            }
        }
        boolean changed = snapshot.size() != current.size();
        if (!changed) {
            for (Map.Entry<Long, BigDecimal> entry : current.entrySet()) {
                BigDecimal snapshotScore = snapshot.get(entry.getKey());
                if (snapshotScore == null || snapshotScore.compareTo(entry.getValue()) != 0) {
                    changed = true;
                    break;
                }
            }
        }
        if (changed) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Danh sách học viên hoặc điểm cuối khóa đã thay đổi sau khi gửi duyệt — không thể duyệt bảng điểm cũ. "
                            + "Hãy từ chối và yêu cầu giảng viên gửi duyệt lại.");
        }
    }

    private Map<Long, BigDecimal> snapshotGrades(Map<String, Object> payload) {
        if (payload == null || !(payload.get("grades") instanceof List<?> rows)) {
            return null;
        }
        Map<Long, BigDecimal> grades = new HashMap<>();
        for (Object item : rows) {
            if (!(item instanceof Map<?, ?> row)) {
                return null;
            }
            Long enrollmentId = toLong(row.get("enrollmentId"));
            BigDecimal score = toDecimal(row.get("finalScore"));
            if (enrollmentId == null || score == null) {
                return null;
            }
            grades.put(enrollmentId, score);
        }
        return grades;
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private BigDecimal toDecimal(Object value) {
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return new BigDecimal(number.toString());
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    @Override
    public void onReject(Request request, RequestReviewRequest review) {        log.info("[CourseGradeApprovalHandler] Từ chối bảng điểm cho khóa học ID: {}, lý do: {}",
                request.getTargetEntityId(), review.getNote());
    }
}
