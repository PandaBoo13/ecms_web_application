package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Setter @Getter
public class QuizResponse {
    private Long id;
    private Long courseId;
    private String title;
    private String quizType;
    private Integer passingScore;
    private Integer maxAttempts;
    private Integer timeLimit;
    private Boolean shuffleQuestions;
    private Integer totalQuestions;
    private String hashtagFilter;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}