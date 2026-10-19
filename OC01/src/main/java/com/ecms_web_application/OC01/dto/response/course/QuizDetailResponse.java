package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
public class QuizDetailResponse extends QuizResponse {
    private List<QuizQuestionView> questions = new ArrayList<>();
}