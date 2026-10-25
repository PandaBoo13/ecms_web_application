package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.CourseResource;
import com.ecms_web_application.OC01.entity.Progress;
import com.ecms_web_application.OC01.entity.enums.ProgressScope;
import com.ecms_web_application.OC01.entity.enums.ProgressStatus;
import com.ecms_web_application.OC01.entity.enums.ProgressType;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.repository.ProgressRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
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
    private final AccountRepository accountRepository;

    // ============================================================
    // PUBLIC API
    // ============================================================

    @Override
    @Transactional
    public void recalculateForCourse(Long courseId) {
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null) { return; }

        List<Progress> list = progressRepository
                .findByCourse_IdAndProgressType(courseId, ProgressScope.COURSE);
        if (list.isEmpty()) return;

        for (Progress p : list) {
            recalcInternal(p, course);
        }
        log.debug("[Calc] recalculateForCourse({}) → {} progress", courseId, list.size());
    }

    @Override
    @Transactional
    public void recalculateForStudent(Long accountId, Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Course không tồn tại"));

        Progress p = progressRepository
                .findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
                        accountId, courseId, ProgressScope.COURSE, null)
                .orElseGet(() -> {
                    Account acc = accountRepository.findById(accountId)
                            .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                                    "Account không tồn tại"));
                    Progress np = new Progress();
                    np.setAccount(acc);
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
    public void onQuizGraded(Long accountId, Long courseId) {
        recalculateForStudent(accountId, courseId);
    }

    // ============================================================
    // CORE CALCULATION
    // ============================================================

    private void recalcInternal(Progress courseProg, Course course) {
        Long accountId = courseProg.getAccount().getId();
        Long courseId = course.getId();

        int total;
        int completed;

        if (course.getProgressType() == ProgressType.COMPLETION_BASED) {
            List<CourseResource> units = resourceRepository.findRequiredProgressUnits(courseId);
            total = units.size();
            if (total == 0) {
                completed = 0;
            } else {
                Set<Long> unitIds = units.stream()
                        .map(CourseResource::getId)
                        .collect(Collectors.toSet());
                List<Progress> resources = progressRepository
                        .findByAccount_IdAndCourse_IdAndProgressType(
                                accountId, courseId, ProgressScope.RESOURCE);
                completed = (int) resources.stream()
                        .filter(rp -> rp.getReferenceId() != null
                                && unitIds.contains(rp.getReferenceId()))
                        .filter(rp -> rp.getStatus() == ProgressStatus.COMPLETED
                                || rp.getStatus() == ProgressStatus.PASSED)
                        .count();
            }
        } else { // SESSION_BASED
            total = (int) sessionRepository.countActiveSessions(courseId);
            completed = (int) sessionRepository.countDoneSessions(courseId);
        }

        BigDecimal newPct = (total > 0)
                ? BigDecimal.valueOf(completed * 100.0 / total)
                        .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal curPct = courseProg.getProgressPercentage() != null
                ? courseProg.getProgressPercentage()
                : BigDecimal.ZERO;
        boolean was100 = curPct.compareTo(BigDecimal.valueOf(100)) >= 0;

        // Rule: KHÔNG giảm %
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

        // hasUncompletedNewContent: đã từng 100% nhưng hiện chưa học đủ required
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