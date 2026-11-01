package com.ecms_web_application.OC01.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Lớp đại diện cho nhật ký thay đổi trạng thái Lead (DTO / Model).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeadStatusLog implements Serializable {

    private Long id;
    private Long leadId;
    private String oldStatus;
    private String newStatus;
    private String reason;
    private Long changedBy;
    private LocalDateTime changedAt;
}
