package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.course.QuizCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.QuizSubmitRequest;
import com.ecms_web_application.OC01.dto.response.course.QuizAttemptResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizDetailResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizQuestionView;
import com.ecms_web_application.OC01.dto.response.course.QuizResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Progress;
import com.ecms_web_application.OC01.entity.course.Question;
import com.ecms_web_application.OC01.entity.course.QuizAttempt;
import com.ecms_web_application.OC01.entity.enums.*;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import com.ecms_web_application.OC01.service.QuizService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuizServiceImpl implements QuizService {

    private static final BigDecimal DEFAULT_PASSING_SCORE = BigDecimal.valueOf(70);

    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final ProgressRepository progressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final ProgressCalculationService progressCalculationService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public QuizResponse createQuiz(Long courseId, QuizCreateRequest req) {
        Course course = loadCourse(courseId);
        Account current = SecurityUtils.requireCurrentAccount();
        assertCanEdit(course, current);

        CourseResource quiz = new CourseResource();
        quiz.setCourse(course);
        quiz.setResourceType(ResourceType.QUIZ);
        quiz.setTitle(req.getTitle());
        quiz.setQuizCategory(req.getQuizType());
        quiz.setPassingScore(BigDecimal.valueOf(req.getPassingScore() != null ? req.getPassingScore() : 70));
        quiz.setMaxAttempts(req.getMaxAttempts());
        quiz.setTimeLimit(req.getTimeLimit());
        quiz.setShuffleQuestions(Boolean.TRUE.equals(req.getShuffleQuestions()));
        quiz.setTotalQuestions(req.getTotalQuestions());
        quiz.setHashtagFilter(req.getHashtagFilter());
        quiz.setAvailableFrom(req.getAvailableFrom());
        quiz.setAvailableUntil(req.getAvailableUntil());
        quiz.setStatus(ResourceStatus.PUBLISHED);
        quiz.setIsRequired(req.getQuizType() == QuizCategory.MANDATORY);
        quiz.setIsFreePreview(false);
        quiz.setOrderIndex(0);

        if (req.getParentId() != null) {
            CourseResource parent = resourceRepository.findById(req.getParentId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Parent không tồn tại"));
            if (!parent.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Parent thuộc khóa học khác");
            }
            quiz.setParent(parent);
        }
        quiz.setCreatedBy(current);
        CourseResource saved = resourceRepository.save(quiz);
        auditLogService.log("CREATE", "QUIZ", saved.getId(), "Tạo quiz: " + saved.getTitle());
        return toQuizResponse(saved);
    }

    @Override
    @Transactional
    public QuizResponse updateQuiz(Long courseId, Long quizId, QuizCreateRequest req) {
        CourseResource quiz = loadQuiz(courseId, quizId);
        Account current = SecurityUtils.requireCurrentAccount();
        assertCanEdit(quiz.getCourse(), current);

        if (req.getTitle() != null && !req.getTitle().isBlank()) quiz.setTitle(req.getTitle().trim());
        if (req.getQuizType() != null) {
            quiz.setQuizCategory(req.getQuizType());
            quiz.setIsRequired(req.getQuizType() == QuizCategory.MANDATORY);
        }
        if (req.getPassingScore() != null) quiz.setPassingScore(BigDecimal.valueOf(req.getPassingScore()));
        if (req.getMaxAttempts() != null) quiz.setMaxAttempts(req.getMaxAttempts());
        if (req.getTimeLimit() != null) quiz.setTimeLimit(req.getTimeLimit());
        if (req.getShuffleQuestions() != null) quiz.setShuffleQuestions(req.getShuffleQuestions());
        if (req.getTotalQuestions() != null) quiz.setTotalQuestions(req.getTotalQuestions());
        if (req.getHashtagFilter() != null) quiz.setHashtagFilter(req.getHashtagFilter());
        if (req.getAvailableFrom() != null) quiz.setAvailableFrom(req.getAvailableFrom());
        if (req.getAvailableUntil() != null) quiz.setAvailableUntil(req.getAvailableUntil());

        if (req.getParentId() != null) {
            CourseResource parent = resourceRepository.findById(req.getParentId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Parent không tồn tại"));
            if (!parent.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Parent thuộc khóa học khác");
            }
            quiz.setParent(parent);
        }
        CourseResource saved = resourceRepository.save(quiz);
        auditLogService.log("UPDATE", "QUIZ", quizId, null);
        return toQuizResponse(saved);
    }

    @Override
    @Transactional
    public void deleteQuiz(Long courseId, Long quizId) {
        CourseResource quiz = loadQuiz(courseId, quizId);
        Account current = SecurityUtils.requireCurrentAccount();
        assertCanEdit(quiz.getCourse(), current);
        resourceRepository.delete(quiz);
        auditLogService.log("DELETE", "QUIZ", quizId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizResponse> listQuizzes(Long courseId) {
        Course course = loadCourse(courseId);
        Account current = SecurityUtils.requireCurrentAccount();
        boolean staff = isInstructorOrAdmin(current, course);

        List<CourseResource> quizzes = resourceRepository.findByCourse_IdAndResourceTypeOrderByOrderIndexAsc(courseId, ResourceType.QUIZ);
        if (!staff) {
            quizzes = quizzes.stream().filter(q -> q.getStatus() == ResourceStatus.PUBLISHED).toList();
        }
        return quizzes.stream().map(this::toQuizResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QuizDetailResponse getQuizDetail(Long courseId, Long quizId) {
        CourseResource quiz = loadQuiz(courseId, quizId);
        Account current = SecurityUtils.requireCurrentAccount();
        boolean staff = isInstructorOrAdmin(current, quiz.getCourse());

        if (!staff && quiz.getStatus() != ResourceStatus.PUBLISHED) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Quiz chưa được công bố");
        }

        List<Question> pool = pickQuestions(quiz);
        List<QuizQuestionView> views = pool.stream().map(q -> toQuestionView(q, staff)).toList();

        QuizDetailResponse res = new QuizDetailResponse();
        copyToQuizResponse(quiz, res);
        res.setQuestions(views);
        return res;
    }

    @Override
    @Transactional
    public QuizAttemptResponse startAttempt(Long courseId, Long quizId) {
        CourseResource quiz = loadQuiz(courseId, quizId);
        Account current = SecurityUtils.requireCurrentAccount();
        boolean staff = isInstructorOrAdmin(current, quiz.getCourse());
        
        Enrollment enrollment = null;
        if (!staff) {
            enrollment = getActiveEnrollment(current.getId(), courseId);
        }

        LocalDateTime now = LocalDateTime.now();
        if (quiz.getAvailableFrom() != null && now.isBefore(quiz.getAvailableFrom())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quiz chưa mở");
        }
        if (quiz.getAvailableUntil() != null && now.isAfter(quiz.getAvailableUntil())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quiz đã đóng");
        }

        if (enrollment != null) {
            Optional<QuizAttempt> existingOpt = quizAttemptRepository
                    .findFirstByResource_IdAndEnrollment_IdOrderByAttemptNumberDesc(quizId, enrollment.getId())
                    .filter(a -> a.getStatus() == QuizAttemptStatus.IN_PROGRESS);
            if (existingOpt.isPresent()) {
                QuizAttempt ex = existingOpt.get();
                boolean expired = quiz.getTimeLimit() != null && quiz.getTimeLimit() > 0
                        && Duration.between(ex.getStartedAt(), now).toMinutes() > quiz.getTimeLimit();
                if (expired) {
                    ex.setStatus(QuizAttemptStatus.TIMEOUT);
                    ex.setSubmittedAt(now);
                    quizAttemptRepository.save(ex);
                } else {
                    List<Question> qs = questionRepository.findAllById(ex.getQuestionIds());
                    return toAttemptResponse(ex, qs, false);
                }
            }

            long attemptsCount = quizAttemptRepository.countByResource_IdAndEnrollment_Id(quizId, enrollment.getId());
            if (quiz.getMaxAttempts() != null && attemptsCount >= quiz.getMaxAttempts()) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Đã đạt số lần làm tối đa");
            }

            if (quiz.getQuizCategory() == QuizCategory.MANDATORY
                    && !quizAttemptRepository.findPassedAttempts(quizId, enrollment.getId()).isEmpty()) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Bạn đã pass quiz này");
            }
        }

        List<Question> pool = pickQuestions(quiz);
        if (pool.isEmpty()) throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quiz chưa có câu hỏi");
        if (Boolean.TRUE.equals(quiz.getShuffleQuestions())) Collections.shuffle(pool);
        
        int total = quiz.getTotalQuestions() != null ? quiz.getTotalQuestions() : pool.size();
        total = Math.min(Math.max(1, total), pool.size());
        List<Question> selected = new ArrayList<>(pool.subList(0, total));

        Integer nextAttempt = enrollment != null ? quizAttemptRepository.maxAttemptNumber(quizId, enrollment.getId()) + 1 : 1;

        QuizAttempt attempt = new QuizAttempt();
        attempt.setEnrollment(enrollment);
        attempt.setCourse(quiz.getCourse());
        attempt.setResource(quiz);
        attempt.setAttemptNumber(nextAttempt);
        attempt.setQuestionIds(selected.stream().map(Question::getId).toList());
        attempt.setMaxScore(selected.stream().map(q -> q.getPoints() != null ? q.getPoints() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add));
        attempt.setPassingScore(quiz.getPassingScore() != null ? quiz.getPassingScore() : DEFAULT_PASSING_SCORE);
        attempt.setStatus(QuizAttemptStatus.IN_PROGRESS);
        attempt.setStartedAt(now);

        QuizAttempt saved = quizAttemptRepository.save(attempt);
        auditLogService.log("START_QUIZ", "QUIZ", quizId, "enrollmentId=" + (enrollment != null ? enrollment.getId() : "staff") + ", attempt=" + nextAttempt);
        return toAttemptResponse(saved, selected, false);
    }

    @Override
    @Transactional
    public QuizAttemptResponse submitAttempt(Long courseId, Long quizId, QuizSubmitRequest req) {
        Account current = SecurityUtils.requireCurrentAccount();
        QuizAttempt attempt = quizAttemptRepository.findById(req.getAttemptId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Attempt không tồn tại"));

        if (!isAttemptOwnedByAccount(attempt.getEnrollment(), current.getId())) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Attempt không thuộc về bạn");
        }
        if (!attempt.getResource().getId().equals(quizId) || !attempt.getCourse().getId().equals(courseId)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Attempt không khớp quiz");
        }
        if (attempt.getStatus() != QuizAttemptStatus.IN_PROGRESS) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Attempt đã kết thúc");
        }

        Map<String, Object> answersMap;
        try {
            answersMap = objectMapper.readValue(req.getAnswers(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Định dạng answers không hợp lệ (JSON object required)");
        }

        List<Question> questions = questionRepository.findAllById(attempt.getQuestionIds());
        Map<Long, Question> qMap = questions.stream().collect(Collectors.toMap(Question::getId, q -> q));

        BigDecimal earned = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        for (Long qid : attempt.getQuestionIds()) {
            Question q = qMap.get(qid);
            if (q == null) continue;
            BigDecimal qPoints = q.getPoints() != null ? q.getPoints() : BigDecimal.ZERO;
            total = total.add(qPoints);

            List<String> studentAns = normalizeAnswers(answersMap.get(qid.toString()));
            List<String> correct = q.getCorrectAnswer() != null ? q.getCorrectAnswer() : List.of();
            if (isCorrect(studentAns, correct, q.getQuestionType())) {
                earned = earned.add(qPoints);
            }
        }

        BigDecimal scorePercent = total.signum() > 0
                ? earned.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal passing = attempt.getPassingScore() != null ? attempt.getPassingScore() : DEFAULT_PASSING_SCORE;

        LocalDateTime now = LocalDateTime.now();
        attempt.setAnswers(answersMap);
        attempt.setScore(earned);
        attempt.setMaxScore(total);
        attempt.setIsPassed(scorePercent.compareTo(passing) >= 0);
        attempt.setStatus(QuizAttemptStatus.GRADED);
        attempt.setSubmittedAt(now);
        attempt.setTimeSpent((int) Math.max(0, Duration.between(attempt.getStartedAt(), now).getSeconds()));

        QuizAttempt saved = quizAttemptRepository.save(attempt);

        if (saved.getEnrollment() != null) {
            updateProgressAfterAttempt(saved, attempt.getResource());
        }

        auditLogService.log("SUBMIT_QUIZ", "QUIZ", quizId, "attemptId=" + saved.getId() + ", score=" + scorePercent + "%");
        return toAttemptResponse(saved, questions, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getMyAttempts(Long courseId, Long quizId) {
        Account current = SecurityUtils.requireCurrentAccount();
        loadQuiz(courseId, quizId);
        
        Enrollment enrollment = getActiveEnrollment(current.getId(), courseId);
        return quizAttemptRepository.findByResource_IdAndEnrollment_IdOrderByAttemptNumberDesc(quizId, enrollment.getId())
                .stream().map(a -> {
                    List<Question> qs = questionRepository.findAllById(a.getQuestionIds());
                    return toAttemptResponse(a, qs, a.getStatus() == QuizAttemptStatus.GRADED);
                }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QuizAttemptResponse getAttemptDetail(Long courseId, Long quizId, Long attemptId) {
        Account current = SecurityUtils.requireCurrentAccount();
        loadQuiz(courseId, quizId);
        QuizAttempt a = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Attempt không tồn tại"));
        
        if (!isAttemptOwnedByAccount(a.getEnrollment(), current.getId())) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Attempt không thuộc về bạn");
        }
        List<Question> qs = questionRepository.findAllById(a.getQuestionIds());
        return toAttemptResponse(a, qs, a.getStatus() == QuizAttemptStatus.GRADED);
    }

    private Enrollment getActiveEnrollment(Long accountId, Long courseId) {
        Student student = studentRepository.findByUserId(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Tài khoản chưa được liên kết với hồ sơ học viên"));
        return enrollmentRepository.findByCourseIdAndStudentId(courseId, student.getId()).stream()
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE
                        || enrollment.getStatus() == EnrollmentStatus.COMPLETED)
                .findFirst()
                .orElseThrow(() -> new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không thuộc khóa học này hoặc chưa được kích hoạt"));
    }

    private boolean isAttemptOwnedByAccount(Enrollment enrollment, Long accountId) {
        if (enrollment == null) return true;
        return studentRepository.findById(enrollment.getStudentId())
                .map(Student::getUserId)
                .filter(Objects::nonNull)
                .map(accountId::equals)
                .orElse(false);
    }

    private Course loadCourse(Long courseId) {
        return courseRepository.findById(courseId).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
    }

    private CourseResource loadQuiz(Long courseId, Long quizId) {
        CourseResource quiz = resourceRepository.findById(quizId).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Quiz không tồn tại"));
        if (quiz.getResourceType() != ResourceType.QUIZ) throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Resource không phải QUIZ");
        if (!quiz.getCourse().getId().equals(courseId)) throw new ErrorHandler(HttpStatus.NOT_FOUND, "Quiz không tồn tại trong khóa này");
        return quiz;
    }

    private void assertCanEdit(Course course, Account current) {
        if (current.isAdmin()) return;
        boolean isTeacher = course.getTeacher() != null && course.getTeacher().getId().equals(current.getId());
        boolean isCreator = course.getCreatedBy() != null && course.getCreatedBy().getId().equals(current.getId());
        if (!isTeacher && !isCreator) throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa quiz của khóa này");
    }

    private boolean isInstructorOrAdmin(Account a, Course c) {
        if (a == null) return false;
        if (a.isAdmin()) return true;
        if (c.getTeacher() != null && c.getTeacher().getId().equals(a.getId())) return true;
        if (c.getCreatedBy() != null && c.getCreatedBy().getId().equals(a.getId())) return true;
        return false;
    }

    private List<Question> pickQuestions(CourseResource quiz) {
        List<Question> pool;
        String filter = quiz.getHashtagFilter();
        if (filter != null && !filter.isBlank()) {
            List<String> hashtags = Arrays.stream(filter.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
            pool = questionRepository.findActiveByCourseAndHashtags(quiz.getCourse().getId(), hashtags);
        } else {
            pool = questionRepository.findByCourse_Id(quiz.getCourse().getId()).stream()
                    .filter(q -> q.getStatus() == QuestionStatus.ACTIVE).toList();
        }
        return new ArrayList<>(pool);
    }

    private List<String> normalizeAnswers(Object raw) {
        if (raw == null) return List.of();
        if (raw instanceof List<?> list) {
            return list.stream().filter(Objects::nonNull).map(Object::toString).map(String::trim).toList();
        }
        String s = raw.toString().trim();
        return s.isEmpty() ? List.of() : List.of(s);
    }

    private boolean isCorrect(List<String> a, List<String> c, QuestionType type) {
        if (a.isEmpty() || c.isEmpty()) return false;
        switch (type) {
            case MULTIPLE_CHOICE: {
                Set<String> sa = a.stream().map(String::toLowerCase).collect(Collectors.toSet());
                Set<String> sc = c.stream().map(String::toLowerCase).collect(Collectors.toSet());
                return sa.equals(sc);
            }
            case SINGLE_CHOICE: case TRUE_FALSE: case SHORT_ANSWER:
                return a.get(0).equalsIgnoreCase(c.get(0));
            default: return false;
        }
    }

    private void updateProgressAfterAttempt(QuizAttempt attempt, CourseResource quiz) {
        Long enrollmentId = attempt.getEnrollment().getId();
        Long courseId = attempt.getCourse().getId();
        Long quizId = quiz.getId();

        Progress p = progressRepository
                .findByEnrollment_IdAndCourse_IdAndProgressTypeAndReferenceId(enrollmentId, courseId, ProgressScope.RESOURCE, quizId)
                .orElseGet(() -> {
                    Progress np = new Progress();
                    np.setEnrollment(attempt.getEnrollment());
                    np.setCourse(attempt.getCourse());
                    np.setProgressType(ProgressScope.RESOURCE);
                    np.setReferenceId(quizId);
                    np.setReferenceType("QUIZ");
                    return np;
                });

        p.setAttempts(attempt.getAttemptNumber());
        p.setScore(attempt.getScore());
        p.setMaxScore(attempt.getMaxScore());
        p.setIsPassed(attempt.getIsPassed());
        p.setLastAccessedAt(LocalDateTime.now());
        if (p.getStartedAt() == null) p.setStartedAt(attempt.getStartedAt());
        if (attempt.getTimeSpent() != null) {
            int cur = p.getTotalTimeSpent() != null ? p.getTotalTimeSpent() : 0;
            p.setTotalTimeSpent(cur + attempt.getTimeSpent());
        }

        if (Boolean.TRUE.equals(attempt.getIsPassed())) {
            p.setStatus(ProgressStatus.PASSED);
            if (p.getProgressPercentage() == null || p.getProgressPercentage().compareTo(BigDecimal.valueOf(100)) < 0) {
                p.setProgressPercentage(BigDecimal.valueOf(100));
            }
            if (p.getCompletedAt() == null) p.setCompletedAt(LocalDateTime.now());
        } else {
            boolean everPassed = !quizAttemptRepository.findPassedAttempts(quizId, enrollmentId).isEmpty();
            if (!everPassed) p.setStatus(ProgressStatus.FAILED);
        }

        progressRepository.save(p);

        if (Boolean.TRUE.equals(attempt.getIsPassed()) && Boolean.TRUE.equals(quiz.getIsRequired())) {
            progressCalculationService.onQuizGraded(enrollmentId, courseId);
        }
    }

    private QuizResponse toQuizResponse(CourseResource r) {
        QuizResponse res = new QuizResponse();
        copyToQuizResponse(r, res);
        return res;
    }

    private void copyToQuizResponse(CourseResource r, QuizResponse res) {
        res.setId(r.getId());
        res.setCourseId(r.getCourse().getId());
        res.setTitle(r.getTitle());
        res.setQuizType(r.getQuizCategory() != null ? r.getQuizCategory().name() : null);
        res.setPassingScore(r.getPassingScore() != null ? r.getPassingScore().intValue() : null);
        res.setMaxAttempts(r.getMaxAttempts());
        res.setTimeLimit(r.getTimeLimit());
        res.setShuffleQuestions(r.getShuffleQuestions());
        res.setTotalQuestions(r.getTotalQuestions());
        res.setHashtagFilter(r.getHashtagFilter());
        res.setAvailableFrom(r.getAvailableFrom());
        res.setAvailableUntil(r.getAvailableUntil());
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
    }

    private QuizQuestionView toQuestionView(Question q, boolean showAnswer) {
        QuizQuestionView v = new QuizQuestionView();
        v.setId(q.getId());
        v.setContent(q.getContent());
        v.setQuestionType(q.getQuestionType().name());
        v.setOptions(q.getOptions());
        v.setPoints(q.getPoints());
        v.setOrderIndex(q.getOrderIndex());
        if (showAnswer) {
            v.setCorrectAnswer(q.getCorrectAnswer());
            v.setExplanation(q.getExplanation());
        }
        return v;
    }

    private QuizAttemptResponse toAttemptResponse(QuizAttempt a, List<Question> questions, boolean showAnswer) {
        QuizAttemptResponse res = new QuizAttemptResponse();
        res.setId(a.getId());
        res.setAccountId(a.getEnrollment() == null ? null : studentRepository.findById(a.getEnrollment().getStudentId())
                .map(Student::getUserId).orElse(null));
        res.setCourseId(a.getCourse().getId());
        res.setResourceId(a.getResource().getId());
        res.setAttemptNumber(a.getAttemptNumber());
        res.setQuestionIds(a.getQuestionIds());
        res.setScore(a.getScore());
        res.setMaxScore(a.getMaxScore());
        res.setPassingScore(a.getPassingScore());
        res.setIsPassed(a.getIsPassed());
        res.setStatus(a.getStatus().name());
        res.setStartedAt(a.getStartedAt());
        res.setSubmittedAt(a.getSubmittedAt());
        res.setTimeSpent(a.getTimeSpent());
        if (questions != null) {
            res.setQuestions(questions.stream().map(q -> toQuestionView(q, showAnswer)).toList());
        }
        if (showAnswer && a.getAnswers() != null) res.setAnswers(a.getAnswers());
        return res;
    }
}
