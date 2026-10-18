package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class LeadInteractionResponse {

    private Long id;
    private Long leadId;
    private String interactionType;
    private String notes;
    private String result;
    private String rejectReason;
    private Long performedBy;
    private LocalDateTime createdAt;
}

