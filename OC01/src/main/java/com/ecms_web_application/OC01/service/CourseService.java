package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.*;
import com.ecms_web_application.OC01.dto.response.course.CourseDetailResponse;
import com.ecms_web_application.OC01.dto.response.course.CourseResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CourseService {
    CourseResponse create(CourseCreateRequest request);
    CourseDetailResponse getById(Long id);
    Page<CourseResponse> search(String status, String type, Long teacherId,
                                Long categoryId, String search, Pageable pageable);
    CourseResponse update(Long id, CourseUpdateRequest request);
    CourseResponse updateOfflineInfo(Long id, CourseOfflineInfoRequest request);
    CourseResponse submitForReview(Long id);
    CourseResponse review(Long id, CourseReviewRequest request);
    CourseResponse archive(Long id);
    CourseResponse cancel(Long id, String reason);
    CourseDetailResponse copy(Long sourceCourseId, CourseCopyRequest request);
    void softDelete(Long id);
    void hardDelete(Long id);
    CourseResponse changeTeacher(Long courseId, Long newTeacherId);
}