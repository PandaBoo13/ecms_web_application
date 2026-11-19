package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.dto.response.course.CourseConflictDetail;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.service.CourseConflictService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Handler cho COURSE_REVIEW.
 *
 * Phân tầng validation:
 *
 *   [TẦNG 1 — validateForSubmit] Kiểm tra trước khi gửi duyệt:
 *     - Quyền sở hữu
 *     - Status DRAFT
 *     - title, category, price
 *     - ONLINE: ≥1 Chapter + ≥1 Lesson
 *     - OFFLINE: ≥1 Resource
 *     - TEACHER phải có (cả ONLINE và OFFLINE)
 *
 *   [TẦNG 2 — finalizeSchedule] Kiểm tra sau khi duyệt nội dung (PLANNED → PUBLISHED):
 *     - start_date, end_date, schedule_days
 *     - session_start_time, session_end_time
 *     - min_students, max_students, total_sessions_expected
 *     - room / allowed_room_ids
 *     - Tất cả SESSION đã được gán room + teacher
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CourseReviewHandler implements RequestHandler {

    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;
    private final CourseConflictService courseConflictService;

    @Override
    public RequestType supportedType() {
        return RequestType.COURSE_REVIEW;
    }

    // ============================================================
    // VALIDATE — kiểm tra quyền + nội dung + teacher
    // ============================================================
    @Override
    public void validateCreate(RequestCreateRequest req, RequestType type) {
        // 1. Bắt buộc đăng nhập
        Long currentId = SecurityUtils.requireCurrentAccountId();

        // 2. Course phải tồn tại
        Course c = courseRepository.findById(req.getTargetEntityId())
                .filter(x -> x.getDeletedAt() == null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Không tìm thấy khóa học"));

        // 3. Chỉ ADMIN hoặc chủ sở hữu (createdBy/teacher) mới được submit
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        boolean isCreator = c.getCreatedBy() != null
                && c.getCreatedBy().getId().equals(currentId);
        boolean isTeacher = c.getTeacher() != null
                && c.getTeacher().getId().equals(currentId);
        if (!isAdmin && !isCreator && !isTeacher) {
            log.warn("[CourseReviewHandler] User {} cố submit course {} không phải của mình",
                    currentId, c.getId());
            throw new ErrorHandler(HttpStatus.FORBIDDEN,
                    "Bạn không có quyền gửi duyệt khóa học này");
        }

        // 4. Chỉ DRAFT mới được submit
        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ submit khóa ở DRAFT (hiện tại: " + c.getStatus() + ")");
        }

        // 5. Validate nội dung + teacher
        validateForSubmit(c);
    }

    /**
     * [TẦNG 1] Kiểm tra nội dung tối thiểu trước khi submit duyệt.
     * KHÔNG kiểm tra lịch/phòng — đó là việc admin xếp sau ở giai đoạn PLANNED.
     */
    private void validateForSubmit(Course c) {
        // ── Nội dung cơ bản (mọi COURSE) ──
        if (!StringUtils.hasText(c.getTitle())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu tiêu đề khóa học");
        }
        if (c.getCategory() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu danh mục khóa học");
        }
        if (c.getPrice() == null
                || (c.getPrice().signum() <= 0 && !Boolean.TRUE.equals(c.getIsFree()))) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Giá phải > 0 hoặc is_free = true");
        }

        // ── Teacher (bắt buộc cả ONLINE và OFFLINE) ──
        // Lý do: Admin cần biết ai dạy để duyệt nội dung; generate-session
        // sau này cũng cần teacher. Nếu admin tạo COURSE không có teacher,
        // phải gán qua PATCH /api/courses/{id}/teacher trước khi submit.
        if (c.getTeacher() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Cần gán giảng viên chính trước khi gửi duyệt");
        }

        // ── Nội dung theo loại COURSE ──
        if (c.getCourseType() == CourseType.ONLINE) {
            long chapters = resourceRepository
                    .countByCourse_IdAndResourceType(c.getId(), ResourceType.CHAPTER);
            if (chapters == 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Khóa ONLINE cần ít nhất 1 Chapter");
            }
            long lessons = resourceRepository
                    .countByCourse_IdAndResourceType(c.getId(), ResourceType.LESSON);
            if (lessons == 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Khóa ONLINE cần ít nhất 1 Lesson trong Chapter");
            }
        } else {
            long totalResources = resourceRepository
                    .findByCourse_IdOrderByOrderIndexAsc(c.getId()).size();
            if (totalResources == 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Khóa OFFLINE cần ít nhất 1 RESOURCE (Chapter/Lesson/Quiz)");
            }
        }

        // ⚠️ KHÔNG kiểm tra start_date, end_date, schedule_days,
        // session_start_time, session_end_time, min_students, max_students,
        // total_sessions_expected, room_id — đó là việc của ACADEMIC_ADMIN
        // xếp lịch ở giai đoạn PLANNED. Đã validate trong finalizeSchedule().
    }

    // ============================================================
    // onCreate — DRAFT → PENDING_REVIEW
    // ============================================================
    @Override
    public void onCreate(Request request, RequestCreateRequest req) {
        Course c = courseRepository.findById(request.getTargetEntityId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Không tìm thấy course sau khi tạo request"));

        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Course phải ở DRAFT để chuyển PENDING_REVIEW (hiện tại: "
                            + c.getStatus() + ")");
        }
        c.setStatus(CourseStatus.PENDING_REVIEW);
        courseRepository.save(c);
        log.info("[CourseReviewHandler] DRAFT → PENDING_REVIEW, courseId={}", c.getId());
    }

    // ============================================================
    // onApprove — CÓ CHECK CONFLICT cho OFFLINE
    // ============================================================
    @Override
    public void onApprove(Request request, RequestReviewRequest review) {
        Course c = courseRepository.findById(request.getTargetEntityId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Không tìm thấy course khi duyệt"));

        if (c.getStatus() != CourseStatus.PENDING_REVIEW) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Course không ở PENDING_REVIEW (hiện tại: " + c.getStatus() + ")");
        }

        if (c.getCourseType() == CourseType.ONLINE) {
            c.setStatus(CourseStatus.PUBLISHED);
            log.info("[CourseReviewHandler] PENDING_REVIEW → PUBLISHED (ONLINE), courseId={}",
                    c.getId());
        } else {
            // OFFLINE: check conflict tầng 1 (nếu INSTRUCTOR đã đề xuất lịch)
            List<CourseConflictDetail> conflicts =
                    courseConflictService.checkCourseConflict(c);

            if (!conflicts.isEmpty()) {
                String detail = conflicts.stream()
                        .map(this::formatConflict)
                        .collect(Collectors.joining(" | "));

                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Không thể duyệt — lịch khóa học TRÙNG với " + conflicts.size()
                                + " khóa học khác: " + detail
                                + ". Vui lòng điều chỉnh lịch (giảng viên, phòng, giờ học "
                                + "hoặc thứ dạy) trước khi duyệt.");
            }

            c.setStatus(CourseStatus.PLANNED);
            log.info("[CourseReviewHandler] PENDING_REVIEW → PLANNED (OFFLINE), courseId={}",
                    c.getId());
        }
        courseRepository.save(c);
    }

    // ============================================================
    // onReject — PENDING_REVIEW → DRAFT
    // ============================================================
    @Override
    public void onReject(Request request, RequestReviewRequest review) {
        Course c = courseRepository.findById(request.getTargetEntityId()).orElse(null);
        if (c == null) return;
        if (c.getStatus() == CourseStatus.PENDING_REVIEW) {
            c.setStatus(CourseStatus.DRAFT);
            courseRepository.save(c);
            log.info("[CourseReviewHandler] PENDING_REVIEW → DRAFT (rejected), courseId={}",
                    c.getId());
        } else {
            log.warn("[CourseReviewHandler] onReject bỏ qua — course {} đang ở {}, " +
                            "không phải PENDING_REVIEW",
                    c.getId(), c.getStatus());
        }
    }

    // ============================================================
    // onCancel — PENDING_REVIEW → DRAFT
    // ============================================================
    @Override
    public void onCancel(Request request) {
        Course c = courseRepository.findById(request.getTargetEntityId()).orElse(null);
        if (c == null) return;
        if (c.getStatus() == CourseStatus.PENDING_REVIEW) {
            c.setStatus(CourseStatus.DRAFT);
            courseRepository.save(c);
            log.info("[CourseReviewHandler] PENDING_REVIEW → DRAFT (cancelled), courseId={}",
                    c.getId());
        }
    }

    // ============================================================
    // HELPER
    // ============================================================
    private String formatConflict(CourseConflictDetail cf) {
        String types = String.join(" + ", cf.getConflictTypes());
        StringBuilder sb = new StringBuilder();
        sb.append("[").append(types).append("] ");
        sb.append("course '").append(cf.getConflictingCourseTitle()).append("'");

        if (cf.getConflictTypes().contains("TEACHER")
                && cf.getConflictingTeacherName() != null) {
            sb.append(" (GV: ").append(cf.getConflictingTeacherName()).append(")");
        }
        if (cf.getConflictTypes().contains("ROOM")
                && cf.getConflictingRoomName() != null) {
            sb.append(" (Phòng: ").append(cf.getConflictingRoomName()).append(")");
        }
        return sb.toString();
    }
}