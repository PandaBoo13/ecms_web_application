package com.ecms_web_application.OC01.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeadStatisticsResponse {

    private long totalLeads;
    private long newLeads;
    private long inProgressLeads;
    private long consultedLeads;
    private long convertedLeads;
    private double conversionRate;

    private List<TimePoint> timeline;
    private List<DistributionPoint> distribution;
    private List<ConsultantPerformanceResponse> consultants;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimePoint {
        private String period;
        private long totalLeads;
        private long cumulativeLeads;
        private long convertedLeads;
        private long cumulativeConverted;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DistributionPoint {
        private String status;
        private String label;
        private long count;
        private double percentage;
        private String color;
    }
}
