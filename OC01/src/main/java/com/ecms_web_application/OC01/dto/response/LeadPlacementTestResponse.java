package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class LeadPlacementTestResponse {

    private Long id;
    private Long leadId;
    private String testStatus;
    private LocalDateTime scheduledAt;
    private BigDecimal testScore;
    private String recommendedLevel;
    private String notes;
    private LocalDateTime evaluatedAt;
    private LocalDateTime createdAt;
}

