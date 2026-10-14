package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.request.course.QuestionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.QuestionResponse;
import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.CourseResource;
import com.ecms_web_application.OC01.entity.Question;
import com.ecms_web_application.OC01.entity.enums.QuestionStatus;
import com.ecms_web_application.OC01.entity.enums.QuestionType;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.repository.QuestionRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.QuestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionServiceImpl implements QuestionService {

    private final QuestionRepository questionRepository;
    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public Page<QuestionResponse> search(Long courseId, Long lessonId, String questionType,
                                         String status, String hashtag, String search, Pageable pageable) {
        QuestionType qt = StringUtils.hasText(questionType)
                ? QuestionType.valueOf(questionType.toUpperCase()) : null;
        QuestionStatus st = StringUtils.hasText(status)
                ? QuestionStatus.valueOf(status.toUpperCase()) : null;
        return questionRepository.searchQuestions(courseId, lessonId, qt, st,
                StringUtils.hasText(hashtag) ? hashtag : "",
                StringUtils.hasText(search) ? search.trim() : "",
                pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public QuestionResponse getById(Long id) { return toResponse(getOrThrow(id)); }

    @Override
    @Transactional
    public QuestionResponse create(Long courseId, QuestionCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Course không tồn tại"));

        CourseResource lesson = null;
        if (request.getLessonId() != null) {
            lesson = resourceRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lesson không tồn tại"));
            if (lesson.getResourceType() != ResourceType.LESSON) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "lessonId phải là LESSON");
            }
            if (!lesson.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lesson không thuộc course");
            }
        }

        Question q = new Question();
        q.setCourse(course);
        q.setLesson(lesson);
        q.setQuestionType(request.getQuestionType());
        q.setContent(request.getContent());
        q.setOptions(request.getOptions());
        q.setCorrectAnswer(request.getCorrectAnswer());
        q.setExplanation(request.getExplanation());
        q.setHashtag(request.getHashtag());
        q.setPoints(request.getPoints() != null ? request.getPoints() : BigDecimal.ONE);
        q.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        q.setStatus(request.getStatus() != null ? request.getStatus() : QuestionStatus.ACTIVE);

        Question saved = questionRepository.save(q);
        auditLogService.log("CREATE", "QUESTION", saved.getId(), null);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuestionResponse update(Long id, QuestionCreateRequest request) {
        Question q = getOrThrow(id);
        if (request.getLessonId() != null) {
            CourseResource lesson = resourceRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lesson không tồn tại"));
            q.setLesson(lesson);
        }
        if (request.getQuestionType() != null) q.setQuestionType(request.getQuestionType());
        if (request.getContent() != null) q.setContent(request.getContent());
        if (request.getOptions() != null) q.setOptions(request.getOptions());
        if (request.getCorrectAnswer() != null) q.setCorrectAnswer(request.getCorrectAnswer());
        if (request.getExplanation() != null) q.setExplanation(request.getExplanation());
        if (request.getHashtag() != null) q.setHashtag(request.getHashtag());
        if (request.getPoints() != null) q.setPoints(request.getPoints());
        if (request.getOrderIndex() != null) q.setOrderIndex(request.getOrderIndex());
        if (request.getStatus() != null) q.setStatus(request.getStatus());
        Question saved = questionRepository.save(q);
        auditLogService.log("UPDATE", "QUESTION", id, null);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Question q = getOrThrow(id);
        questionRepository.delete(q);
        auditLogService.log("DELETE", "QUESTION", id, null);
    }

    private Question getOrThrow(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Câu hỏi không tồn tại"));
    }

    private QuestionResponse toResponse(Question q) {
        QuestionResponse r = new QuestionResponse();
        r.setId(q.getId());
        r.setCourseId(q.getCourse().getId());
        if (q.getLesson() != null) {
            r.setLessonId(q.getLesson().getId());
            r.setLessonTitle(q.getLesson().getTitle());
        }
        r.setQuestionType(q.getQuestionType().name());
        r.setContent(q.getContent());
        r.setOptions(q.getOptions());
        r.setCorrectAnswer(q.getCorrectAnswer());
        r.setExplanation(q.getExplanation());
        r.setHashtag(q.getHashtag());
        r.setPoints(q.getPoints());
        r.setOrderIndex(q.getOrderIndex());
        r.setStatus(q.getStatus() != null ? q.getStatus().name() : null);
        r.setCreatedAt(q.getCreatedAt());
        r.setUpdatedAt(q.getUpdatedAt());
        return r;
    }
}