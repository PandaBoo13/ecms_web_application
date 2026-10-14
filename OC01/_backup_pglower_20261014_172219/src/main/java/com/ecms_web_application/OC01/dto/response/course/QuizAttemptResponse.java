package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Setter @Getter
public class QuizAttemptResponse {
    private Long id;
    private Long accountId;
    private Long courseId;
    private Long resourceId;
    private Integer attemptNumber;
    private List<Long> questionIds;
    private BigDecimal score;
    private BigDecimal maxScore;
    private BigDecimal passingScore;
    private Boolean isPassed;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private Integer timeSpent;
}