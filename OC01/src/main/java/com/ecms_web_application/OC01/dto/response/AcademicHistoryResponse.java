package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class AcademicHistoryResponse {

    private Long id;
    private Long studentId;
    private Long leadId;
    private Long enrollmentId;
    private Long courseId;
    private Long classId;
    private BigDecimal finalGrade;
    private LocalDateTime createdAt;
}

