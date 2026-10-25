package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/**
 * View của 1 câu hỏi trong Quiz.
 * correctAnswer / explanation = null khi trả cho HV (không phải GV/Admin).
 */
@Setter
@Getter
public class QuizQuestionView {
    private Long id;
    private String content;
    private String questionType;
    private List<String> options;
    private BigDecimal points;
    private Integer orderIndex;
    private List<String> correctAnswer;
    private String explanation;
}