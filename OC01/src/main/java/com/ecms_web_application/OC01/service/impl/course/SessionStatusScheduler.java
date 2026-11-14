package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * [M7] Scheduler SCHEDULED → ONGOING khi start_time <= now.
 * [M8] Scheduler ONGOING → COMPLETED khi end_time <= now.
 *
 * Chạy mỗi 60 giây. Chia 2 phase:
 *  1. Update statuses trong 1 transaction ngắn.
 *  2. Recalc PROGRESS cho các course bị ảnh hưởng — mỗi course 1 transaction riêng,
 *     lỗi recalc KHÔNG rollback status update.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SessionStatusScheduler {

    private final SessionRepository sessionRepository;
    private final ProgressCalculationService progressCalculationService;
    private final PlatformTransactionManager transactionManager;

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void transitionSessionStatuses() {
        LocalDateTime now = LocalDateTime.now();
        Set<Long> affectedCourseIds = new HashSet<>();
        int[] counts = new int[2]; // [0]=started, [1]=completed

        try {
            TransactionTemplate tt = new TransactionTemplate(transactionManager);
            tt.executeWithoutResult(status -> {
                // [M7] SCHEDULED → ONGOING
                List<Session> toStart = sessionRepository.findScheduledToStart(now);
                for (Session s : toStart) {
                    s.setStatus(SessionStatus.ONGOING);
                    sessionRepository.save(s);
                    counts[0]++;
                }

                // [M8] ONGOING → COMPLETED
                List<Session> toComplete = sessionRepository.findOngoingToComplete(now);
                for (Session s : toComplete) {
                    s.setStatus(SessionStatus.COMPLETED);
                    sessionRepository.save(s);
                    counts[1]++;
                    if (s.getCourse() != null) {
                        affectedCourseIds.add(s.getCourse().getId());
                    }
                }
            });
        } catch (Exception e) {
            log.error("[SessionStatusScheduler] Update statuses failed: {}", e.getMessage(), e);
            return;
        }

        // Recalc PROGRESS cho các course có session vừa COMPLETED
        for (Long courseId : affectedCourseIds) {
            try {
                progressCalculationService.onSessionChanged(courseId);
            } catch (Exception e) {
                log.warn("[SessionStatusScheduler] Recalc progress failed for course {}: {}",
                        courseId, e.getMessage());
            }
        }

        if (counts[0] > 0 || counts[1] > 0) {
            log.info("[SessionStatusScheduler] SCHEDULED→ONGOING={}, ONGOING→COMPLETED={}, recalc_courses={}",
                    counts[0], counts[1], affectedCourseIds.size());
        }
    }
}