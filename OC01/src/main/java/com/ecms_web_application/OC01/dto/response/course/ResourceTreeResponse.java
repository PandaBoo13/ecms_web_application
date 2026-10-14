package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Setter @Getter
public class ResourceTreeResponse {
    private Long id;
    private String resourceType;
    private String title;
    private Integer orderIndex;
    private Boolean isRequired;
    private Boolean isFreePreview;
    private Integer duration;
    private String fileUrl;
    private String status;
    private String quizCategory;
    private BigDecimal passingScore;
    private Integer maxAttempts;
    private List<ResourceTreeResponse> children = new ArrayList<>();
}