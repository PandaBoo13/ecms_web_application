package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.response.course.ProgressResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ProgressService {
    Page<ProgressResponse> getMyCourses(Pageable pageable);
    ProgressResponse getMyProgressInCourse(Long courseId);
    List<ProgressResponse> getResourceProgresses(Long courseId);
    ProgressResponse updateResourceProgress(Long resourceId, Integer percentage, Long timeSpentSeconds);
    ProgressResponse markResourceCompleted(Long resourceId);
}