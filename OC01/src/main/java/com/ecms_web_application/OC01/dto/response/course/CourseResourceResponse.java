package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Setter @Getter
public class CourseResourceResponse {
    private Long id;
    private Long courseId;
    private Long parentId;
    private String resourceType;
    private String title;
    private String description;
    private Integer orderIndex;
    private Boolean isRequired;
    private Boolean isFreePreview;
    private Integer duration;
    private String content;
    private String thumbnailUrl;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileFormat;
    private String mimeType;
    private Integer maxAttempts;
    private BigDecimal passingScore;
    private Integer timeLimit;
    private BigDecimal points;
    private LocalDateTime deadline;
    private Map<String, Object> settings;
    private String status;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;
    private String quizCategory;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String hashtagFilter;
    private Integer totalQuestions;
    private Boolean shuffleQuestions;
}