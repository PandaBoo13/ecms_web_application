package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.request.course.QuestionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.QuestionImportResult;
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
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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

        CourseResource lesson = resolveLesson(courseId, request.getLessonId());

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

        // Cập nhật hoặc gỡ bài học (nếu lessonId == null thì setLesson(null))
        q.setLesson(resolveLesson(q.getCourse().getId(), request.getLessonId()));

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

    private CourseResource resolveLesson(Long courseId, Long lessonId) {
        if (lessonId == null) {
            return null;
        }
        CourseResource lesson = resourceRepository.findById(lessonId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lesson không tồn tại"));
        if (lesson.getResourceType() != ResourceType.LESSON) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "lessonId phải là LESSON");
        }
        if (!lesson.getCourse().getId().equals(courseId)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lesson không thuộc course");
        }
        return lesson;
    }

    private Question getOrThrow(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Câu hỏi không tồn tại"));
    }

    private void assertCourseEditable(Course course) {
        if (course.getStatus() != CourseStatus.DRAFT) {
            String hint = (course.getStatus() == CourseStatus.PENDING_REVIEW)
                    ? " Vui lòng thu hồi yêu cầu kiểm duyệt (POST /api/courses/" + course.getId() + "/withdraw-review) trước khi sửa."
                    : "";
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể thay đổi QUESTION khi khóa học ở trạng thái " + course.getStatus() + ". Chỉ DRAFT mới được sửa." + hint);
        }
    }

    // Thêm vào QuestionServiceImpl.java
    @Transactional
    @Override
    public QuestionImportResult importFromExcel(Long courseId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng chọn file Excel (.xlsx)");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ định dạng file .xlsx");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Course không tồn tại"));
        assertCourseEditable(course);

        // Cache sẵn các lesson hợp lệ của course để tránh N+1 query khi import 1000 dòng
        // Trong QuestionServiceImpl.importFromExcel(...)
        Map<Long, CourseResource> validLessonMap = resourceRepository
                .findByCourse_IdAndResourceTypeOrderByOrderIndexAsc(courseId, ResourceType.LESSON)
                .stream()
                .collect(Collectors.toMap(CourseResource::getId, Function.identity()));

        List<Question> validQuestions = new ArrayList<>();
        List<QuestionImportResult.RowError> errors = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        int totalRows = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();

            for (int i = 1; i <= lastRow; i++) { // Dòng 0 là header
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row, formatter)) continue;

                totalRows++;
                int excelRowNum = i + 1;
                String rawContent = getCellString(row, 1, formatter);

                try {
                    Question q = parseRowToQuestion(row, formatter, course, validLessonMap, i);
                    validQuestions.add(q);
                } catch (IllegalArgumentException ex) {
                    errors.add(new QuestionImportResult.RowError(
                            excelRowNum,
                            StringUtils.hasText(rawContent) ? rawContent : "(Trống nội dung)",
                            ex.getMessage()
                    ));
                }
            }
        } catch (IOException e) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể đọc nội dung file Excel: " + e.getMessage());
        }

        // Lưu hàng loạt (Batch insert)
        if (!validQuestions.isEmpty()) {
            List<Question> saved = questionRepository.saveAll(validQuestions);
            auditLogService.log("IMPORT_EXCEL", "QUESTION", courseId,
                    "Imported " + saved.size() + " questions");
        }

        return QuestionImportResult.builder()
                .totalRows(totalRows)
                .successCount(validQuestions.size())
                .failedCount(errors.size())
                .errors(errors)
                .build();
    }

    private Question parseRowToQuestion(Row row, DataFormatter formatter, Course course,
                                        Map<Long, CourseResource> validLessonMap, int defaultOrder) {
        String typeStr = getCellString(row, 0, formatter).toUpperCase();
        String content = getCellString(row, 1, formatter);
        String optA = getCellString(row, 2, formatter);
        String optB = getCellString(row, 3, formatter);
        String optC = getCellString(row, 4, formatter);
        String optD = getCellString(row, 5, formatter);
        String rawCorrect = getCellString(row, 6, formatter);
        String pointsStr = getCellString(row, 7, formatter);
        String hashtag = getCellString(row, 8, formatter);
        String lessonIdStr = getCellString(row, 9, formatter);
        String explanation = getCellString(row, 10, formatter);

        if (!StringUtils.hasText(typeStr)) {
            throw new IllegalArgumentException("Thiếu loại câu hỏi (questionType)");
        }
        QuestionType qType;
        try {
            qType = QuestionType.valueOf(typeStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Loại câu hỏi không hợp lệ: " + typeStr);
        }

        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("Thiếu nội dung câu hỏi");
        }
        if (!StringUtils.hasText(rawCorrect)) {
            throw new IllegalArgumentException("Thiếu đáp án đúng (correctAnswer)");
        }

        List<String> options = null;
        List<String> correctAnswers = new ArrayList<>();

        if (qType == QuestionType.SINGLE_CHOICE || qType == QuestionType.MULTIPLE_CHOICE) {
            Map<String, String> letterToText = new LinkedHashMap<>();
            if (StringUtils.hasText(optA)) letterToText.put("A", optA);
            if (StringUtils.hasText(optB)) letterToText.put("B", optB);
            if (StringUtils.hasText(optC)) letterToText.put("C", optC);
            if (StringUtils.hasText(optD)) letterToText.put("D", optD);

            options = new ArrayList<>(letterToText.values());
            if (options.size() < 2) {
                throw new IllegalArgumentException("Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn (A, B)");
            }

            // Hỗ trợ nhập theo chữ cái (A hoặc A,C) hoặc nhập trực tiếp text đáp án
            String[] tokens = rawCorrect.split("[,;|]");
            for (String tk : tokens) {
                String key = tk.trim();
                if (key.isEmpty()) continue;
                if (letterToText.containsKey(key.toUpperCase())) {
                    correctAnswers.add(letterToText.get(key.toUpperCase()));
                } else if (options.contains(key)) {
                    correctAnswers.add(key);
                } else {
                    throw new IllegalArgumentException("Đáp án đúng '" + key + "' không khớp với các lựa chọn A-D");
                }
            }
            if (correctAnswers.isEmpty()) {
                throw new IllegalArgumentException("Không xác định được đáp án đúng");
            }
            if (qType == QuestionType.SINGLE_CHOICE && correctAnswers.size() > 1) {
                throw new IllegalArgumentException("SINGLE_CHOICE chỉ được có 1 đáp án đúng");
            }
        } else if (qType == QuestionType.TRUE_FALSE) {
            String norm = rawCorrect.trim().toLowerCase();
            if (norm.equals("true") || norm.equals("đúng") || norm.equals("1")) {
                correctAnswers.add("true");
            } else if (norm.equals("false") || norm.equals("sai") || norm.equals("0")) {
                correctAnswers.add("false");
            } else {
                throw new IllegalArgumentException("TRUE_FALSE chỉ nhận TRUE hoặc FALSE");
            }
        } else if (qType == QuestionType.SHORT_ANSWER) {
            correctAnswers.add(rawCorrect.trim());
        }

        BigDecimal points = BigDecimal.ONE;
        if (StringUtils.hasText(pointsStr)) {
            try {
                points = new BigDecimal(pointsStr);
                if (points.compareTo(BigDecimal.ZERO) < 0) throw new NumberFormatException();
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Điểm số không hợp lệ: " + pointsStr);
            }
        }

        CourseResource lesson = null;
        if (StringUtils.hasText(lessonIdStr)) {
            try {
                Long lId = Long.parseLong(lessonIdStr);
                lesson = validLessonMap.get(lId);
                if (lesson == null) {
                    throw new IllegalArgumentException("lessonId " + lId + " không tồn tại trong khóa học này");
                }
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("lessonId phải là số nguyên");
            }
        }

        Question q = new Question();
        q.setCourse(course);
        q.setLesson(lesson);
        q.setQuestionType(qType);
        q.setContent(content);
        q.setOptions(options);
        q.setCorrectAnswer(correctAnswers);
        q.setPoints(points);
        q.setHashtag(StringUtils.hasText(hashtag) ? hashtag : null);
        q.setExplanation(StringUtils.hasText(explanation) ? explanation : null);
        q.setOrderIndex(defaultOrder);
        q.setStatus(QuestionStatus.ACTIVE);
        return q;
    }

    private String getCellString(Row row, int colIdx, DataFormatter formatter) {
        Cell cell = row.getCell(colIdx);
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }

    private boolean isRowEmpty(Row row, DataFormatter formatter) {
        for (int c = 0; c <= 10; c++) {
            if (StringUtils.hasText(getCellString(row, c, formatter))) return false;
        }
        return true;
    }

    @Override
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Questions");
            String[] headers = {
                    "questionType", "content", "optionA", "optionB", "optionC", "optionD",
                    "correctAnswer", "points", "hashtag", "lessonId", "explanation"
            };

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Thêm 2 dòng ví dụ mẫu
            Object[][] sampleRows = {
                    {"SINGLE_CHOICE", "Thủ đô của Việt Nam là thành phố nào?", "Hà Nội", "Đà Nẵng", "TP.HCM", "Huế", "A", 1, "dia-ly", "", "Hà Nội là thủ đô của Việt Nam"},
                    {"MULTIPLE_CHOICE", "Những ngôn ngữ nào chạy trên JVM?", "Java", "Kotlin", "Python", "Scala", "A,B,D", 2, "lap-trinh", "", "Java, Kotlin và Scala biên dịch ra bytecode chạy trên JVM"},
                    {"TRUE_FALSE", "Spring Boot hỗ trợ nhúng sẵn Tomcat server.", "", "", "", "", "TRUE", 1, "spring", "", ""},
                    {"SHORT_ANSWER", "Từ khóa khai báo hằng số trong Java là gì?", "", "", "", "", "final", 1, "java-core", "", ""}
            };

            for (int r = 0; r < sampleRows.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < sampleRows[r].length; c++) {
                    Object val = sampleRows[r][c];
                    if (val instanceof Number num) {
                        row.createCell(c).setCellValue(num.doubleValue());
                    } else {
                        row.createCell(c).setCellValue(String.valueOf(val));
                    }
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file mẫu Excel");
        }
    }
}