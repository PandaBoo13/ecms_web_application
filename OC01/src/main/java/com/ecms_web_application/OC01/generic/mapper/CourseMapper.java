package com.ecms_web_application.OC01.generic.mapper;

import com.ecms_web_application.OC01.dto.response.course.CourseDetailResponse;
import com.ecms_web_application.OC01.dto.response.course.CourseResourceResponse;
import com.ecms_web_application.OC01.dto.response.course.CourseResponse;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Mapper chuyển đổi giữa Entity ↔ DTO cho COURSE_MODULE.
 * Chỉ mapping dữ liệu, KHÔNG chứa business logic.
 */
@Component
public class CourseMapper {

    // ============================================================
    // COURSE → CourseResponse (list/search)
    // ============================================================
    public CourseResponse toResponse(Course c) {
        if (c == null) return null;
        CourseResponse r = new CourseResponse();
        copyCommonFields(c, r);
        return r;
    }

    // ============================================================
    // COURSE (+ resources) → CourseDetailResponse (getById)
    // ============================================================
    public CourseDetailResponse toDetailResponse(Course c, List<CourseResource> resources) {
        if (c == null) return null;
        CourseDetailResponse r = new CourseDetailResponse();
        copyCommonFields(c, r);
        r.setDescription(c.getDescription());
        r.setOutcomes(c.getOutcomes());

        List<CourseResourceResponse> items = new ArrayList<>();
        if (resources != null) {
            for (CourseResource res : resources) {
                items.add(toResourceResponse(res));
            }
        }
        r.setResources(items);
        return r;
    }

    // ============================================================
    // RESOURCE → CourseResourceResponse
    // ============================================================
    public CourseResourceResponse toResourceResponse(CourseResource r) {
        if (r == null) return null;
        CourseResourceResponse res = new CourseResourceResponse();
        res.setId(r.getId());
        res.setCourseId(r.getCourse() != null ? r.getCourse().getId() : null);
        res.setParentId(r.getParent() != null ? r.getParent().getId() : null);
        res.setResourceType(r.getResourceType() != null ? r.getResourceType().name() : null);
        res.setTitle(r.getTitle());
        res.setDescription(r.getDescription());
        res.setOrderIndex(r.getOrderIndex());
        res.setIsRequired(r.getIsRequired());
        res.setIsFreePreview(r.getIsFreePreview());
        res.setDuration(r.getDuration());
        res.setContent(r.getContent());
        res.setThumbnailUrl(r.getThumbnailUrl());
        res.setFileName(r.getFileName());
        res.setFileUrl(r.getFileUrl());
        res.setFileSize(r.getFileSize());
        res.setFileFormat(r.getFileFormat());
        res.setMimeType(r.getMimeType());
        res.setMaxAttempts(r.getMaxAttempts());
        res.setPassingScore(r.getPassingScore());
        res.setTimeLimit(r.getTimeLimit());
        res.setPoints(r.getPoints());
        res.setDeadline(r.getDeadline());
        res.setSettings(r.getSettings());
        res.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        res.setAvailableFrom(r.getAvailableFrom());
        res.setAvailableUntil(r.getAvailableUntil());
        res.setQuizCategory(r.getQuizCategory() != null ? r.getQuizCategory().name() : null);
        res.setHashtagFilter(r.getHashtagFilter());
        res.setTotalQuestions(r.getTotalQuestions());
        res.setShuffleQuestions(r.getShuffleQuestions());
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
        return res;
    }

    // ============================================================
    // Shared: các field chung giữa CourseResponse & CourseDetailResponse
    // ============================================================
    private void copyCommonFields(Course c, CourseResponse r) {
        r.setId(c.getId());
        r.setCode(c.getCode());
        r.setSlug(c.getSlug());
        r.setDisplayCode(c.getDisplayCode());
        r.setTitle(c.getTitle());
        r.setShortDescription(c.getShortDescription());
        r.setThumbnailUrl(c.getThumbnailUrl());
        r.setPrice(c.getPrice());
        r.setOldPrice(c.getOldPrice());
        r.setIsFree(c.getIsFree());
        r.setCourseType(c.getCourseType() != null ? c.getCourseType().name() : null);
        r.setProgressType(c.getProgressType() != null ? c.getProgressType().name() : null);
        r.setStatus(c.getStatus() != null ? c.getStatus().name() : null);

        if (c.getTeacher() != null) {
            r.setTeacherId(c.getTeacher().getId());
            if (c.getTeacher().getUserProfile() != null) {
                r.setTeacherName(c.getTeacher().getUserProfile().getFullName());
            }
        }
        if (c.getCreatedBy() != null) r.setCreatedById(c.getCreatedBy().getId());
        if (c.getCategory() != null) {
            r.setCategoryId(c.getCategory().getId());
            r.setCategoryName(c.getCategory().getName());
        }
        if (c.getRoom() != null) {
            r.setRoomId(c.getRoom().getId());
            r.setRoomName(c.getRoom().getName());
        }
        r.setMinStudents(c.getMinStudents());
        r.setMaxStudents(c.getMaxStudents());
        r.setCurrentStudents(c.getCurrentStudents());
        r.setStartDate(c.getStartDate());
        r.setEndDate(c.getEndDate());
        r.setScheduleDays(c.getScheduleDays());
        r.setSessionStartTime(c.getSessionStartTime());
        r.setSessionEndTime(c.getSessionEndTime());
        r.setCopiedFromCourseId(c.getCopiedFromCourseId());
        r.setLearningMode(c.getLearningMode());
        r.setAllowedRoomIds(c.getAllowedRoomIds());
        r.setTotalSessionsExpected(c.getTotalSessionsExpected());
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
    }
}