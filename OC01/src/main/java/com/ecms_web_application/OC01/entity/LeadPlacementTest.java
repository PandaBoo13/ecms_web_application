package com.ecms_web_application.OC01.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Lớp đại diện cho kết quả đánh giá đầu vào của Lead (Model / DTO).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeadPlacementTest implements Serializable {

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
