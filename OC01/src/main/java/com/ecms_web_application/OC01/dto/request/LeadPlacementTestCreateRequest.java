package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class LeadPlacementTestCreateRequest {

    @NotBlank(message = "Trạng thái test không được để trống (SCHEDULED, COMPLETED, REFUSED, NOT_ATTENDED)")
    private String testStatus;

    private LocalDateTime scheduledAt;

    private BigDecimal testScore;

    private String recommendedLevel;

    private String notes;

    private LocalDateTime evaluatedAt;
}

