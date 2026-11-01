package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class LeadResponse {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Long courseId;
    private Long studentId;
    private String status;
    private LocalDateTime consultedAt;
    private LocalDateTime convertedAt;
    private String sourceName;
    private String channelType;
    private Long sourceId;
    private Long assignedConsultantId;
    private String note;
    private String placementTestStatus;
    private BigDecimal placementTestScore;
    private String placementRecommendedLevel;
    private String placementTestNotes;
    private LocalDateTime placementEvaluatedAt;
    private LocalDateTime placementTestCreatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
