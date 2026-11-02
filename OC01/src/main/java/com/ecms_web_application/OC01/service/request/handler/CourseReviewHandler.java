package com.ecms_web_application.OC01.service.request.handler;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Handler cho COURSE_REVIEW.
 *
 * 8 trạng thái COURSE giữ nguyên:
 *   DRAFT ─(onCreate)→ PENDING_REVIEW
 *         ─(onApprove ONLINE)→ PUBLISHED
 *         ─(onApprove OFFLINE)→ PLANNED ─(finalize-schedule)→ PUBLISHED
 *         ─(onReject / onCancel)→ DRAFT
 *
 * Validate 2 MỨC:
 *   - validateForSubmit (nhẹ): chỉ content — cho phép INSTRUCTOR submit
 *     khi chưa có lịch (ACADEMIC_ADMIN sẽ xếp lịch sau khi PLANNED)
 *   - validateForPublish (đầy đủ): do CourseServiceImpl.finalizeSchedule đảm nhận
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CourseReviewHandler implements RequestHandler {

    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;

    @Override
    public RequestType supportedType() {
        return RequestType.COURSE_REVIEW;
    }

    // ============================================================
    // VALIDATE — mức nhẹ (submit)
    // ============================================================
    @Override
    public void validateCreate(RequestCreateRequest req, RequestType type) {
        Course c = courseRepository.findById(req.getTargetEntityId())
                .filter(x -> x.getDeletedAt() == null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Không tìm thấy khóa học"));

        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ submit khóa ở DRAFT (hiện tại: " + c.getStatus() + ")");
        }
        validateForSubmit(c);
    }

    /**
     * Validate nhẹ — CHỈ content bắt buộc.
     * Lịch/GV/room có thể để trống — ACADEMIC_ADMIN sẽ xếp sau khi duyệt.
     */
    private void validateForSubmit(Course c) {
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
    // onApprove — ONLINE→PUBLISHED ; OFFLINE→PLANNED
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
            log.info("[CourseReviewHandler] PENDING_REVIEW → PUBLISHED (ONLINE), courseId={}", c.getId());
        } else {
            c.setStatus(CourseStatus.PLANNED);
            log.info("[CourseReviewHandler] PENDING_REVIEW → PLANNED (OFFLINE), courseId={}", c.getId());
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
            log.info("[CourseReviewHandler] PENDING_REVIEW → DRAFT (rejected), courseId={}", c.getId());
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
            log.info("[CourseReviewHandler] PENDING_REVIEW → DRAFT (cancelled), courseId={}", c.getId());
        }
    }
}