package com.ecms_web_application.OC01.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
public class InstructorSpecializationResponse {

    private Long accountId;
    private String instructorName;   // Full name từ profile
    private String instructorEmail;

    private Long categoryId;
    private String categoryName;
    private String categorySlug;

    private Boolean isPrimary;
    private Short yearsOfExp;
    private LocalDateTime createdAt;
}