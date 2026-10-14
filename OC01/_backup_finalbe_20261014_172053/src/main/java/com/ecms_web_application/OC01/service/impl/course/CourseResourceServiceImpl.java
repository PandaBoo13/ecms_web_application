package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.course.ResourceCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.ResourceUpdateRequest;
import com.ecms_web_application.OC01.dto.response.course.CourseResourceResponse;
import com.ecms_web_application.OC01.dto.response.course.ResourceTreeResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.CourseResource;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.CourseResourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseResourceServiceImpl implements CourseResourceService {

    private final CourseResourceRepository resourceRepository;
    private final CourseRepository courseRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<ResourceTreeResponse> getTreeByCourse(Long courseId) {
        List<CourseResource> all = resourceRepository.findByCourse_IdOrderByOrderIndexAsc(courseId);
        Map<Long, ResourceTreeResponse> map = new HashMap<>();
        for (CourseResource r : all) map.put(r.getId(), toTree(r));
        List<ResourceTreeResponse> roots = new ArrayList<>();
        for (CourseResource r : all) {
            ResourceTreeResponse node = map.get(r.getId());
            if (r.getParent() == null) roots.add(node);
            else {
                ResourceTreeResponse parent = map.get(r.getParent().getId());
                if (parent != null) parent.getChildren().add(node);
            }
        }
        return roots;
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResourceResponse getById(Long id) { return toResponse(getOrThrow(id)); }

    @Override
    @Transactional
    public CourseResourceResponse create(Long courseId, ResourceCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        Account current = SecurityUtils.getCurrentAccount();

        CourseResource parent = null;
        if (request.getParentId() != null) {
            parent = getOrThrow(request.getParentId());
            if (!parent.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Parent thuộc course khác");
            }
            validateHierarchy(parent.getResourceType(), request.getResourceType());
        } else if (request.getResourceType() != ResourceType.CHAPTER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Resource gốc phải là CHAPTER");
        }

        CourseResource r = new CourseResource();
        r.setCourse(course);
        r.setParent(parent);
        r.setResourceType(request.getResourceType());
        r.setTitle(request.getTitle().trim());
        r.setDescription(request.getDescription());
        Integer next = request.getOrderIndex() != null ? request.getOrderIndex()
                : (parent == null
                    ? Optional.ofNullable(resourceRepository.maxRootOrderIndex(courseId)).orElse(-1) + 1
                    : Optional.ofNullable(resourceRepository.maxChildOrderIndex(parent.getId())).orElse(-1) + 1);
        r.setOrderIndex(next);
        r.setIsRequired(Boolean.TRUE.equals(request.getIsRequired()));
        r.setIsFreePreview(Boolean.TRUE.equals(request.getIsFreePreview()));
        r.setDuration(request.getDuration() != null ? request.getDuration() : 0);
        r.setContent(request.getContent());
        r.setThumbnailUrl(request.getThumbnailUrl());
        r.setFileName(request.getFileName());
        r.setFileUrl(request.getFileUrl());
        r.setFileSize(request.getFileSize());
        r.setFileFormat(request.getFileFormat());
        r.setMimeType(request.getMimeType());
        r.setMaxAttempts(request.getMaxAttempts());
        r.setPassingScore(request.getPassingScore());
        r.setTimeLimit(request.getTimeLimit());
        r.setPoints(request.getPoints() != null ? request.getPoints() : BigDecimal.ZERO);
        r.setDeadline(request.getDeadline());
        r.setSettings(request.getSettings());
        r.setStatus(request.getStatus());
        r.setAvailableFrom(request.getAvailableFrom());
        r.setAvailableUntil(request.getAvailableUntil());
        r.setQuizCategory(request.getQuizCategory());
        r.setCreatedBy(current);

        CourseResource saved = resourceRepository.save(r);
        auditLogService.log("CREATE", "RESOURCE", saved.getId(),
                "Tạo " + request.getResourceType() + ": " + saved.getTitle());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResourceResponse update(Long id, ResourceUpdateRequest request) {
        CourseResource r = getOrThrow(id);
        if (request.getTitle() != null && !request.getTitle().isBlank()) r.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) r.setDescription(request.getDescription());
        if (request.getOrderIndex() != null)  r.setOrderIndex(request.getOrderIndex());
        if (request.getIsRequired() != null)  r.setIsRequired(request.getIsRequired());
        if (request.getIsFreePreview() != null) r.setIsFreePreview(request.getIsFreePreview());
        if (request.getDuration() != null)    r.setDuration(request.getDuration());
        if (request.getContent() != null)     r.setContent(request.getContent());
        if (request.getThumbnailUrl() != null) r.setThumbnailUrl(request.getThumbnailUrl());
        if (request.getFileName() != null)    r.setFileName(request.getFileName());
        if (request.getFileUrl() != null)     r.setFileUrl(request.getFileUrl());
        if (request.getFileSize() != null)    r.setFileSize(request.getFileSize());
        if (request.getFileFormat() != null)  r.setFileFormat(request.getFileFormat());
        if (request.getMimeType() != null)    r.setMimeType(request.getMimeType());
        if (request.getMaxAttempts() != null) r.setMaxAttempts(request.getMaxAttempts());
        if (request.getPassingScore() != null) r.setPassingScore(request.getPassingScore());
        if (request.getTimeLimit() != null)   r.setTimeLimit(request.getTimeLimit());
        if (request.getPoints() != null)      r.setPoints(request.getPoints());
        if (request.getDeadline() != null)    r.setDeadline(request.getDeadline());
        if (request.getSettings() != null)    r.setSettings(request.getSettings());
        if (request.getStatus() != null)      r.setStatus(request.getStatus());
        if (request.getAvailableFrom() != null)  r.setAvailableFrom(request.getAvailableFrom());
        if (request.getAvailableUntil() != null) r.setAvailableUntil(request.getAvailableUntil());
        if (request.getQuizCategory() != null) r.setQuizCategory(request.getQuizCategory());

        CourseResource saved = resourceRepository.save(r);
        auditLogService.log("UPDATE", "RESOURCE", id, null);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        CourseResource r = getOrThrow(id);
        if (resourceRepository.existsByParent_Id(id)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể xóa — còn resource con");
        }
        resourceRepository.delete(r);
        auditLogService.log("DELETE", "RESOURCE", id, null);
    }

    private CourseResource getOrThrow(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Resource không tồn tại"));
    }

    private void validateHierarchy(ResourceType parentType, ResourceType childType) {
        boolean ok = switch (parentType) {
            case CHAPTER -> childType == ResourceType.LESSON || childType == ResourceType.QUIZ;
            case LESSON -> childType == ResourceType.VIDEO || childType == ResourceType.PDF
                    || childType == ResourceType.SLIDE || childType == ResourceType.AUDIO
                    || childType == ResourceType.QUIZ || childType == ResourceType.ASSIGNMENT
                    || childType == ResourceType.LINK || childType == ResourceType.DOCUMENT
                    || childType == ResourceType.IMAGE;
            default -> true;
        };
        if (!ok) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    String.format("Không thể đặt %s dưới %s", childType, parentType));
        }
    }

    private CourseResourceResponse toResponse(CourseResource r) {
        CourseResourceResponse res = new CourseResourceResponse();
        res.setId(r.getId());
        res.setCourseId(r.getCourse().getId());
        res.setParentId(r.getParent() != null ? r.getParent().getId() : null);
        res.setResourceType(r.getResourceType().name());
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
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
        return res;
    }

    private ResourceTreeResponse toTree(CourseResource r) {
        ResourceTreeResponse t = new ResourceTreeResponse();
        t.setId(r.getId());
        t.setResourceType(r.getResourceType().name());
        t.setTitle(r.getTitle());
        t.setOrderIndex(r.getOrderIndex());
        t.setIsRequired(r.getIsRequired());
        t.setIsFreePreview(r.getIsFreePreview());
        t.setDuration(r.getDuration());
        t.setFileUrl(r.getFileUrl());
        t.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        t.setQuizCategory(r.getQuizCategory() != null ? r.getQuizCategory().name() : null);
        t.setPassingScore(r.getPassingScore());
        t.setMaxAttempts(r.getMaxAttempts());
        return t;
    }
}