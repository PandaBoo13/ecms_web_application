package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Setter @Getter
public class ProgressResponse {
    private Long id;
    private Long accountId;
    private Long courseId;
    private String courseTitle;
    private String progressType;
    private Long referenceId;
    private String referenceType;
    private String status;
    private BigDecimal progressPercentage;
    private Integer totalTimeSpent;
    private BigDecimal score;
    private BigDecimal maxScore;
    private Boolean isPassed;
    private Integer attempts;
    private String notes;
    private Integer totalItems;
    private Integer completedItems;
    private BigDecimal weightedScore;
    private BigDecimal totalWeightPercent;
    private LocalDateTime lastAccessedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Boolean hasUncompletedNewContent;
}