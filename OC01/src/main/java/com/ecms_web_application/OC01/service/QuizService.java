package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.QuizCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.QuizSubmitRequest;
import com.ecms_web_application.OC01.dto.response.course.QuizAttemptResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizDetailResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizResponse;

import java.util.List;

public interface QuizService {

    QuizResponse createQuiz(Long courseId, QuizCreateRequest request);

    QuizResponse updateQuiz(Long courseId, Long quizId, QuizCreateRequest request);

    void deleteQuiz(Long courseId, Long quizId);

    QuizDetailResponse getQuizDetail(Long courseId, Long quizId);

    List<QuizResponse> listQuizzes(Long courseId);

    QuizAttemptResponse startAttempt(Long courseId, Long quizId);

    QuizAttemptResponse submitAttempt(Long courseId, Long quizId, QuizSubmitRequest request);

    List<QuizAttemptResponse> getMyAttempts(Long courseId, Long quizId);

    QuizAttemptResponse getAttemptDetail(Long courseId, Long quizId, Long attemptId);
}