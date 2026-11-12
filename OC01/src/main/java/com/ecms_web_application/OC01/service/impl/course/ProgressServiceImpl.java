package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.course.ProgressResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Progress;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.ProgressScope;
import com.ecms_web_application.OC01.entity.enums.ProgressStatus;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.ProgressRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.ProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressServiceImpl implements ProgressService {

    private final ProgressRepository progressRepository;
    private final CourseResourceRepository resourceRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final com.ecms_web_application.OC01.service.ProgressCalculationService progressCalculationService;

    @Override
    @Transactional(readOnly = true)
    public Page<ProgressResponse> getMyCourses(Pageable pageable) {
        Account current = SecurityUtils.requireCurrentAccount();
        Student student = findStudentForAccount(current.getId());
        return progressRepository.findCourseProgressByStudent(student.getId(), pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ProgressResponse getMyProgressInCourse(Long courseId) {
        Account current = SecurityUtils.requireCurrentAccount();
        Enrollment enrollment = getActiveEnrollment(current.getId(), courseId);

        Progress p = progressRepository.findByEnrollment_IdAndCourse_IdAndProgressTypeAndReferenceId(
                        enrollment.getId(), courseId, ProgressScope.COURSE, null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Chưa có progress"));
        return toResponse(p);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProgressResponse> getResourceProgresses(Long courseId) {
        Account current = SecurityUtils.requireCurrentAccount();
        Enrollment enrollment = getActiveEnrollment(current.getId(), courseId);
        
        return progressRepository.findByEnrollment_IdAndCourse_IdAndProgressType(
                        enrollment.getId(), courseId, ProgressScope.RESOURCE)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ProgressResponse updateResourceProgress(Long resourceId, Integer percentage, Long timeSpentSeconds) {
        Account current = SecurityUtils.requireCurrentAccount();
        CourseResource r = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Resource không tồn tại"));
        Enrollment enrollment = getActiveEnrollment(current.getId(), r.getCourse().getId());

        Progress p = progressRepository.findByEnrollment_IdAndCourse_IdAndProgressTypeAndReferenceId(
                        enrollment.getId(), r.getCourse().getId(), ProgressScope.RESOURCE, resourceId)
                .orElseGet(() -> {
                    Progress np = new Progress();
                    np.setEnrollment(enrollment);
                    np.setCourse(r.getCourse());
                    np.setProgressType(ProgressScope.RESOURCE);
                    np.setReferenceId(resourceId);
                    np.setReferenceType(r.getResourceType().name());
                    return np;
                });

        BigDecimal newPct = percentage != null ? BigDecimal.valueOf(Math.min(100, Math.max(0, percentage))) : BigDecimal.ZERO;
        BigDecimal cur = p.getProgressPercentage() != null ? p.getProgressPercentage() : BigDecimal.ZERO;
        if (newPct.compareTo(cur) > 0) p.setProgressPercentage(newPct);

        if (timeSpentSeconds != null && timeSpentSeconds > 0) {
            int curTime = p.getTotalTimeSpent() != null ? p.getTotalTimeSpent() : 0;
            p.setTotalTimeSpent(curTime + timeSpentSeconds.intValue());
        }
        p.setLastAccessedAt(LocalDateTime.now());
        if (p.getStartedAt() == null) p.setStartedAt(LocalDateTime.now());

        BigDecimal effective = p.getProgressPercentage() != null ? p.getProgressPercentage() : BigDecimal.ZERO;
        if (effective.compareTo(BigDecimal.valueOf(100)) >= 0) {
            p.setStatus(ProgressStatus.COMPLETED);
            p.setCompletedAt(LocalDateTime.now());
        } else if (effective.signum() > 0) {
            p.setStatus(ProgressStatus.IN_PROGRESS);
        }

        Progress saved = progressRepository.save(p);
        if (saved.getStatus() == ProgressStatus.COMPLETED || saved.getStatus() == ProgressStatus.PASSED) {
            progressCalculationService.recalculateForEnrollment(saved.getEnrollment().getId(), saved.getCourse().getId());
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ProgressResponse markResourceCompleted(Long resourceId) {
        return updateResourceProgress(resourceId, 100, null);
    }

    @Override
    @Transactional
    public void markHasUncompletedNewContent(Long courseId) {
        progressCalculationService.onResourceChanged(courseId);
    }

    @Override
    @Transactional
    public void recalculateCourseProgress(Long courseId) {
        progressCalculationService.recalculateForCourse(courseId);
    }

    private Enrollment getActiveEnrollment(Long accountId, Long courseId) {
        Student student = findStudentForAccount(accountId);
        return enrollmentRepository.findByCourseIdAndStudentId(courseId, student.getId()).stream()
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE
                        || enrollment.getStatus() == EnrollmentStatus.COMPLETED)
                .findFirst()
                .orElseThrow(() -> new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không thuộc khóa học này hoặc chưa được kích hoạt"));
    }

    private Student findStudentForAccount(Long accountId) {
        return studentRepository.findByUserId(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Tài khoản chưa được liên kết với hồ sơ học viên"));
    }

    private ProgressResponse toResponse(Progress p) {
        ProgressResponse r = new ProgressResponse();
        r.setId(p.getId());
        r.setAccountId(p.getEnrollment() == null ? null : studentRepository.findById(p.getEnrollment().getStudentId())
                .map(Student::getUserId).orElse(null));
        r.setCourseId(p.getCourse().getId());
        r.setCourseTitle(p.getCourse().getTitle());
        r.setProgressType(p.getProgressType().name());
        r.setReferenceId(p.getReferenceId());
        r.setReferenceType(p.getReferenceType());
        r.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        r.setProgressPercentage(p.getProgressPercentage());
        r.setTotalTimeSpent(p.getTotalTimeSpent());
        r.setScore(p.getScore());
        r.setMaxScore(p.getMaxScore());
        r.setIsPassed(p.getIsPassed());
        r.setAttempts(p.getAttempts());
        r.setNotes(p.getNotes());
        r.setTotalItems(p.getTotalItems());
        r.setCompletedItems(p.getCompletedItems());
        r.setWeightedScore(p.getWeightedScore());
        r.setTotalWeightPercent(p.getTotalWeightPercent());
        r.setLastAccessedAt(p.getLastAccessedAt());
        r.setStartedAt(p.getStartedAt());
        r.setCompletedAt(p.getCompletedAt());
        r.setHasUncompletedNewContent(p.getHasUncompletedNewContent());
        return r;
    }
}
