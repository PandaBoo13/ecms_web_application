package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.ResourceCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.ResourceUpdateRequest;
import com.ecms_web_application.OC01.dto.response.course.CourseResourceResponse;
import com.ecms_web_application.OC01.dto.response.course.ResourceTreeResponse;
import java.util.List;

public interface CourseResourceService {
    List<ResourceTreeResponse> getTreeByCourse(Long courseId);
    CourseResourceResponse getById(Long id);
    CourseResourceResponse create(Long courseId, ResourceCreateRequest request);
    CourseResourceResponse update(Long id, ResourceUpdateRequest request);
    void delete(Long id);
}