package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.entity.course.QuizAttempt;
import com.ecms_web_application.OC01.entity.enums.QuizAttemptStatus;
import com.ecms_web_application.OC01.repository.QuizAttemptRepository;
import com.ecms_web_application.OC01.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * [M9] Scheduler tự động thu bài QUIZ_ATTEMPT khi hết time_limit.
 *
 * Chạy mỗi 60 giây.
 * - Load tất cả attempt IN_PROGRESS có timeLimit > 0 và startedAt <= (now - 1 phút)
 *   (1 phút là timeLimit nhỏ nhất có thể — tránh load dư).
 * - Filter chính xác: elapsed >= timeLimit → gọi QuizService.autoSubmitTimedOutAttempt
 * - Mỗi attempt chạy trong transaction riêng (nhờ @Transactional trên service method) —
 *   lỗi 1 attempt không ảnh hưởng attempt khác.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuizTimeoutScheduler {

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizService quizService;

    @Scheduled(fixedDelay = 60_000, initialDelay = 45_000)
    public void autoSubmitTimedOutAttempts() {
        LocalDateTime now = LocalDateTime.now();
        // cutoff = now - 1 phút: bất kỳ attempt nào có startedAt lớn hơn mốc này
        // thì chắc chắn chưa hết giờ (vì timeLimit tối thiểu = 1 phút).
        LocalDateTime cutoff = now.minusMinutes(1);

        List<QuizAttempt> candidates;
        try {
            candidates = quizAttemptRepository.findExpiredCandidates(
                    QuizAttemptStatus.IN_PROGRESS, cutoff);
        } catch (Exception e) {
            log.error("[QuizTimeoutScheduler] Query failed: {}", e.getMessage(), e);
            return;
        }

        if (candidates.isEmpty()) return;

        int submitted = 0;
        int failed = 0;
        for (QuizAttempt attempt : candidates) {
            try {
                Integer limit = attempt.getResource().getTimeLimit();
                if (limit == null || limit <= 0) continue;

                long elapsedMinutes = Duration.between(attempt.getStartedAt(), now).toMinutes();
                if (elapsedMinutes >= limit) {
                    quizService.autoSubmitTimedOutAttempt(attempt.getId());
                    submitted++;
                }
            } catch (Exception e) {
                failed++;
                log.warn("[QuizTimeoutScheduler] Failed for attemptId={}: {}",
                        attempt.getId(), e.getMessage());
            }
        }

        if (submitted > 0 || failed > 0) {
            log.info("[QuizTimeoutScheduler] Auto-submitted={}, failed={}, total_candidates={}",
                    submitted, failed, candidates.size());
        }
    }
}