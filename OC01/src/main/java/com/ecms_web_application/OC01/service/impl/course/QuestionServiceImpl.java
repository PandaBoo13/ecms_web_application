package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.request.course.QuestionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.QuestionResponse;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Question;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.QuestionStatus;
import com.ecms_web_application.OC01.entity.enums.QuestionType;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.mapper.CourseModuleMapper;
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
    private final CourseModuleMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Page<QuestionResponse> search(Long courseId, Long lessonId, String questionType,
                                         String status, String hashtag, String search, Pageable pageable) {
        QuestionType qt = StringUtils.hasText(questionType) ? QuestionType.valueOf(questionType.toUpperCase()) : null;
        QuestionStatus st = StringUtils.hasText(status) ? QuestionStatus.valueOf(status.toUpperCase()) : null;
        return questionRepository.searchQuestions(courseId, lessonId, qt, st,
                StringUtils.hasText(hashtag) ? hashtag : "",
                StringUtils.hasText(search) ? search.trim() : "",
                pageable).map(mapper::toQuestionResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public QuestionResponse getById(Long id) {
        return mapper.toQuestionResponse(getOrThrow(id));
    }

    @Override
    @Transactional
    public QuestionResponse create(Long courseId, QuestionCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Course không tồn tại"));
        assertCourseEditable(course);

        if (request.getLessonId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "lessonId là bắt buộc — mọi câu hỏi phải thuộc một LESSON");
        }
        CourseResource lesson = resourceRepository.findById(request.getLessonId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lesson không tồn tại"));
        if (lesson.getResourceType() != ResourceType.LESSON) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "lessonId phải là LESSON");
        }
        if (!lesson.getCourse().getId().equals(courseId)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lesson không thuộc course");
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
        return mapper.toQuestionResponse(saved);
    }

    @Override
    @Transactional
    public QuestionResponse update(Long id, QuestionCreateRequest request) {
        Question q = getOrThrow(id);
        assertCourseEditable(q.getCourse());

        if (request.getLessonId() != null) {
            CourseResource lesson = resourceRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lesson không tồn tại"));
            if (lesson.getResourceType() != ResourceType.LESSON) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "lessonId phải là LESSON");
            }
            if (!lesson.getCourse().getId().equals(q.getCourse().getId())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lesson không thuộc cùng khóa học với câu hỏi");
            }
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
        return mapper.toQuestionResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Question q = getOrThrow(id);
        assertCourseEditable(q.getCourse());
        questionRepository.delete(q);
        auditLogService.log("DELETE", "QUESTION", id, null);
    }

    private Question getOrThrow(Long id) {
        return questionRepository.findById(id).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Câu hỏi không tồn tại"));
    }

    private void assertCourseEditable(Course course) {
        if (course.getStatus() != CourseStatus.DRAFT) {
            String hint = (course.getStatus() == CourseStatus.PENDING_REVIEW)
                    ? " Vui lòng thu hồi yêu cầu kiểm duyệt (POST /api/courses/" + course.getId() + "/withdraw-review) trước khi sửa."
                    : "";
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể thay đổi QUESTION khi khóa học ở trạng thái " + course.getStatus() + ". Chỉ DRAFT mới được sửa." + hint);
        }
    }
}