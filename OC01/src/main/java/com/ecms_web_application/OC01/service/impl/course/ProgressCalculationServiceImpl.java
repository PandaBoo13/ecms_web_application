package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Progress;
import com.ecms_web_application.OC01.entity.enums.ProgressScope;
import com.ecms_web_application.OC01.entity.enums.ProgressStatus;
import com.ecms_web_application.OC01.entity.enums.ProgressType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressCalculationServiceImpl implements ProgressCalculationService {

    private final ProgressRepository progressRepository;
    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;
    private final SessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    @Transactional
    public void recalculateForCourse(Long courseId) {
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null) return;

        List<Progress> list = progressRepository.findByCourse_IdAndProgressType(courseId, ProgressScope.COURSE);
        for (Progress p : list) {
            recalcInternal(p, course);
        }
    }

    @Override
    @Transactional
    public void recalculateForEnrollment(Long enrollmentId, Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Course không tồn tại"));
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Enrollment không tồn tại"));

        Progress p = progressRepository
                .findByEnrollment_IdAndCourse_IdAndProgressTypeAndReferenceId(enrollmentId, courseId, ProgressScope.COURSE, null)
                .orElseGet(() -> {
                    Progress np = new Progress();
                    np.setEnrollment(enrollment);
                    np.setCourse(course);
                    np.setProgressType(ProgressScope.COURSE);
                    np.setReferenceId(null);
                    np.setReferenceType(null);
                    np.setStatus(ProgressStatus.NOT_STARTED);
                    np.setProgressPercentage(BigDecimal.ZERO);
                    np.setStartedAt(LocalDateTime.now());
                    return np;
                });

        recalcInternal(p, course);
    }

    @Override
    @Transactional
    public void onResourceChanged(Long courseId) {
        recalculateForCourse(courseId);
    }

    @Override
    @Transactional
    public void onSessionChanged(Long courseId) {
        recalculateForCourse(courseId);
    }

    @Override
    @Transactional
    public void onQuizGraded(Long enrollmentId, Long courseId) {
        recalculateForEnrollment(enrollmentId, courseId);
    }

    private void recalcInternal(Progress courseProg, Course course) {
        Long enrollmentId = courseProg.getEnrollment().getId();
        Long courseId = course.getId();

        int total;
        int completed;

        if (course.getProgressType() == ProgressType.COMPLETION_BASED) {
            List<CourseResource> units = resourceRepository.findRequiredProgressUnits(courseId);
            total = units.size();
            if (total == 0) {
                completed = 0;
            } else {
                Set<Long> unitIds = units.stream().map(CourseResource::getId).collect(Collectors.toSet());
                List<Progress> resources = progressRepository.findByEnrollment_IdAndCourse_IdAndProgressType(
                                enrollmentId, courseId, ProgressScope.RESOURCE);
                completed = (int) resources.stream()
                        .filter(rp -> rp.getReferenceId() != null && unitIds.contains(rp.getReferenceId()))
                        .filter(rp -> rp.getStatus() == ProgressStatus.COMPLETED || rp.getStatus() == ProgressStatus.PASSED)
                        .count();
            }
        } else {
            total = (int) sessionRepository.countActiveSessions(courseId);
            completed = (int) sessionRepository.countDoneSessions(courseId);
        }

        BigDecimal newPct = (total > 0)
                ? BigDecimal.valueOf(completed * 100.0 / total).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal curPct = courseProg.getProgressPercentage() != null ? courseProg.getProgressPercentage() : BigDecimal.ZERO;
        boolean was100 = curPct.compareTo(BigDecimal.valueOf(100)) >= 0;

        BigDecimal finalPct = newPct.max(curPct);

        ProgressStatus newStatus;
        if (finalPct.compareTo(BigDecimal.valueOf(100)) >= 0) {
            newStatus = ProgressStatus.COMPLETED;
        } else if (finalPct.signum() > 0) {
            newStatus = ProgressStatus.IN_PROGRESS;
        } else {
            newStatus = ProgressStatus.NOT_STARTED;
        }

        courseProg.setTotalItems(total);
        courseProg.setCompletedItems(completed);
        courseProg.setProgressPercentage(finalPct);
        courseProg.setStatus(newStatus);
        courseProg.setLastAccessedAt(LocalDateTime.now());
        if (newStatus == ProgressStatus.COMPLETED && courseProg.getCompletedAt() == null) {
            courseProg.setCompletedAt(LocalDateTime.now());
        }

        boolean flag;
        if (total == 0) {
            flag = false;
        } else if (completed >= total) {
            flag = false;
        } else {
            flag = was100;
        }
        courseProg.setHasUncompletedNewContent(flag);

        progressRepository.save(courseProg);
    }
}
