package com.ecms_web_application.OC01.dto.response.course;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionGenerationResult {
    private Long courseId;
    private int totalDates;
    private int generated;
    @Builder.Default
    private List<SkippedDate> skipped = new ArrayList<>();
    private String message;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SkippedDate {
        private LocalDate date;
        private String reason;
    }
}