package com.ecms_web_application.OC01.dto.response.course;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionImportResult {
    private int totalRows;
    private int successCount;
    private int failedCount;
    @Builder.Default
    private List<RowError> errors = new ArrayList<>();

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RowError {
        private int rowNumber; // Số dòng thực tế trong Excel (tính từ 2)
        private String content;
        private String reason;
    }
}