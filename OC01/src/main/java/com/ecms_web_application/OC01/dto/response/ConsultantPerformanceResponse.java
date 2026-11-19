package com.ecms_web_application.OC01.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultantPerformanceResponse {
    private Long consultantId;
    private String name;
    private String email;
    private String phone;
    private String workStatus;
    private long totalLeads;
    private long newLeads;
    private long inProgressLeads;
    private long consultedLeads;
    private long convertedLeads;
    private double conversionRate; // Tỷ lệ chốt thành công %
    private String performanceTier; // EXCELLENT (>=30%), STANDARD (15-29%), NEEDS_IMPROVEMENT (<15%)
}
