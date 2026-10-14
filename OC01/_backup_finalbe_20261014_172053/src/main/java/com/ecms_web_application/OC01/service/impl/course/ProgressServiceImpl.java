package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.course.ProgressResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.CourseResource;
import com.ecms_web_application.OC01.entity.Progress;
import com.ecms_web_application.OC01.entity.enums.ProgressScope;
import com.ecms_web_application.OC01.entity.enums.ProgressStatus;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.repository.ProgressRepository;
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

    @Override
    @Transactional(readOnly = true)
    public Page<ProgressResponse> getMyCourses(Pageable pageable) {
        Account current = SecurityUtils.requireCurrentAccount();
        return progressRepository.findCourseProgressByAccount(current.getId(), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ProgressResponse getMyProgressInCourse(Long courseId) {
        Account current = SecurityUtils.requireCurrentAccount();
        Progress p = progressRepository
                .findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
                        current.getId(), courseId, ProgressScope.COURSE, null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Chưa có progress"));
        return toResponse(p);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProgressResponse> getResourceProgresses(Long courseId) {
        Account current = SecurityUtils.requireCurrentAccount();
        return progressRepository.findByAccount_IdAndCourse_IdAndProgressType(
                        current.getId(), courseId, ProgressScope.RESOURCE)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ProgressResponse updateResourceProgress(Long resourceId, Integer percentage, Long timeSpentSeconds) {
        Account current = SecurityUtils.requireCurrentAccount();
        CourseResource r = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Resource không tồn tại"));

        Progress p = progressRepository
                .findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
                        current.getId(), r.getCourse().getId(), ProgressScope.RESOURCE, resourceId)
                .orElseGet(() -> {
                    Progress np = new Progress();
                    np.setAccount(current);
                    np.setCourse(r.getCourse());
                    np.setProgressType(ProgressScope.RESOURCE);
                    np.setReferenceId(resourceId);
                    np.setReferenceType(r.getResourceType().name());
                    return np;
                });

        BigDecimal newPct = percentage != null
                ? BigDecimal.valueOf(Math.min(100, Math.max(0, percentage)))
                : BigDecimal.ZERO;
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
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ProgressResponse markResourceCompleted(Long resourceId) {
        return updateResourceProgress(resourceId, 100, null);
    }

    private ProgressResponse toResponse(Progress p) {
        ProgressResponse r = new ProgressResponse();
        r.setId(p.getId());
        r.setAccountId(p.getAccount().getId());
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
        return r;
    }
}