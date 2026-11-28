package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.QuestionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.QuestionImportResult;
import com.ecms_web_application.OC01.dto.response.course.QuestionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

public interface QuestionService {
    Page<QuestionResponse> search(Long courseId, Long lessonId, String questionType,
                                  String status, String hashtag, String search, Pageable pageable);
    QuestionResponse getById(Long id);
    QuestionResponse create(Long courseId, QuestionCreateRequest request);
    QuestionResponse update(Long id, QuestionCreateRequest request);
    void delete(Long id);

    // Thêm vào QuestionServiceImpl.java
    @Transactional
    QuestionImportResult importFromExcel(Long courseId, MultipartFile file);

    // Thêm vào QuestionServiceImpl.java


    byte[] generateImportTemplate();
}