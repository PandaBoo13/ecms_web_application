package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Setter @Getter
public class QuestionResponse {
    private Long id;
    private Long courseId;
    private Long lessonId;
    private String lessonTitle;
    private String questionType;
    private String content;
    private List<String> options;
    private List<String> correctAnswer;
    private String explanation;
    private String hashtag;
    private BigDecimal points;
    private Integer orderIndex;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}