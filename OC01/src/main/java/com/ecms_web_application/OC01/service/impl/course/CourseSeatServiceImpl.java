// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/service/impl/course/CourseSeatServiceImpl.java
// ============================================================
package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.response.course.AvailableSeatsResponse;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.service.CourseSeatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourseSeatServiceImpl implements CourseSeatService {

    private static final List<EnrollmentStatus> SEAT_HOLDING_STATUSES =
            List.of(EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE);

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final InvoiceRepository invoiceRepository;

    @Override
    @Transactional(readOnly = true)
    public AvailableSeatsResponse getAvailableSeats(Long courseId) {

        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Khóa học không tồn tại"));

        // ── Đếm 3 nguồn chiếm chỗ ──
        // 1. Hoá đơn còn hiệu lực: PENDING chưa quá hạn + PAID chưa hoàn đủ
        long effectiveInvoices = invoiceRepository.countEffectiveTuitionInvoicesByCourse(
                course.getId(),
                InvoiceType.TUITION_PAYMENT,
                InvoiceStatus.PENDING,
                InvoiceStatus.PAID,
                InvoiceType.REFUND,
                LocalDateTime.now(),
                null);

        // 2. Enrollment đang giữ chỗ (PENDING + ACTIVE)
        long enrolledCount = enrollmentRepository.countByCourseIdAndStatusIn(
                course.getId(), SEAT_HOLDING_STATUSES);

        // 3. currentStudents (cột denormalized có thể lệch — dùng max để an toàn)
        int currentStudents = course.getCurrentStudents() != null
                ? course.getCurrentStudents() : 0;

        long occupiedSeats = Math.max(effectiveInvoices,
                Math.max(enrolledCount, currentStudents));

        Integer maxStudents = course.getMaxStudents();
        Integer availableSeats = (maxStudents != null && maxStudents > 0)
                ? Math.max(0, maxStudents - (int) occupiedSeats)
                : null;

        // isFull: chỉ xét khi có maxStudents
        boolean isFull = maxStudents != null && maxStudents > 0
                && occupiedSeats >= maxStudents;

        // isOpenForEnrollment: chỉ PUBLISHED mới mở
        boolean isOpen = course.getStatus() == CourseStatus.PUBLISHED;

        // Lý do đóng (nếu đóng) — trả về 1 reason duy nhất cho FE
        String reason = null;
        if (!isOpen) {
            reason = switch (course.getStatus()) {
                case DRAFT, PENDING_REVIEW, PLANNED -> "COURSE_NOT_PUBLISHED";
                case ONGOING -> "COURSE_ONGOING";
                case FINISHED -> "COURSE_FINISHED";
                case CANCELLED -> "COURSE_CANCELLED";
                case ARCHIVED -> "COURSE_ARCHIVED";
                default -> "COURSE_NOT_OPEN";
            };
        } else if (isFull) {
            reason = "COURSE_FULL";
        }

        return new AvailableSeatsResponse(
                course.getId(),
                course.getCode(),
                course.getTitle(),
                course.getCourseType() != null ? course.getCourseType().name() : null,
                course.getStatus() != null ? course.getStatus().name() : null,
                maxStudents,
                (int) occupiedSeats,
                availableSeats,
                isFull,
                isOpen,
                reason);
    }
}