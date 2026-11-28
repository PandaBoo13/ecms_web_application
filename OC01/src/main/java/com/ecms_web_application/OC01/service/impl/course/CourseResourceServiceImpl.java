package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.dto.request.course.ResourceCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.ResourceReorderRequest;
import com.ecms_web_application.OC01.dto.request.course.ResourceUpdateRequest;
import com.ecms_web_application.OC01.dto.response.course.CourseResourceResponse;
import com.ecms_web_application.OC01.dto.response.course.ResourceTreeResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.QuizCategory;
import com.ecms_web_application.OC01.entity.enums.ResourceStatus;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.mapper.CourseModuleMapper;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.CourseResourceService;
import com.ecms_web_application.OC01.service.NotificationService;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
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
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final ProgressCalculationService progressCalculationService;
    private final CourseModuleMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public List<ResourceTreeResponse> getTreeByCourse(Long courseId) {
        List<CourseResource> all = resourceRepository.findByCourse_IdOrderByOrderIndexAsc(courseId);
        Map<Long, ResourceTreeResponse> map = new HashMap<>();
        for (CourseResource r : all) map.put(r.getId(), mapper.toResourceTreeResponse(r));
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
    public CourseResourceResponse getById(Long id) {
        return mapper.toCourseResourceResponse(getOrThrow(id));
    }

    @Override
    @Transactional
    public CourseResourceResponse create(Long courseId, ResourceCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        assertCourseEditable(course);

        Account current = SecurityUtils.getCurrentAccount();

        CourseResource parent = null;
        if (request.getParentId() != null) {
            parent = getOrThrow(request.getParentId());
            if (!parent.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Parent thuộc course khác");
            }
            validateHierarchy(parent.getResourceType(), request.getResourceType());
        } else if (request.getResourceType() == ResourceType.LESSON) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Bài học (LESSON) phải thuộc một chương (CHAPTER)");
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
        r.setHashtagFilter(request.getHashtagFilter());
        r.setTotalQuestions(request.getTotalQuestions());
        r.setShuffleQuestions(Boolean.TRUE.equals(request.getShuffleQuestions()));
        r.setCreatedBy(current);

        CourseResource saved = resourceRepository.save(r);
        triggerRecalcIfRequired(saved);
        notifyStudentsIfMandatoryQuizPublished(saved, null);
        auditLogService.log("CREATE", "RESOURCE", saved.getId(), "Tạo " + request.getResourceType() + ": " + saved.getTitle());
        return mapper.toCourseResourceResponse(saved);
    }

    @Override
    @Transactional
    public CourseResourceResponse update(Long id, ResourceUpdateRequest request) {
        CourseResource r = getOrThrow(id);
        Course course = r.getCourse();
        ResourceStatus previousStatus = r.getStatus();

        // Nếu khóa học không ở trạng thái DRAFT: chỉ cho phép đổi trạng thái của QUIZ
        if (course.getStatus() != CourseStatus.DRAFT) {
            if (r.getResourceType() == ResourceType.QUIZ && isQuizStatusOnlyUpdate(request)) {
                if (request.getStatus() != null) {
                    r.setStatus(request.getStatus());
                }
                if (request.getAvailableFrom() != null) {
                    r.setAvailableFrom(request.getAvailableFrom());
                }
                if (request.getAvailableUntil() != null) {
                    r.setAvailableUntil(request.getAvailableUntil());
                }

                CourseResource saved = resourceRepository.save(r);
                triggerRecalcIfRequired(saved);
                notifyStudentsIfMandatoryQuizPublished(saved, previousStatus);
                auditLogService.log("UPDATE_STATUS", "RESOURCE", id, "Cập nhật trạng thái Quiz: " + saved.getStatus());
                return mapper.toCourseResourceResponse(saved);
            }

            // Các trường hợp sửa đổi khác khi course != DRAFT vẫn chặn như cũ
            assertCourseEditable(course);
        }

        // 1. Gỡ tài nguyên khỏi bài học -> đưa về kho chung của khóa học (parent = null)
        if (Boolean.TRUE.equals(request.getDetachParent())) {
            if (r.getResourceType() == ResourceType.CHAPTER || r.getResourceType() == ResourceType.LESSON) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể gỡ CHAPTER hoặc LESSON về kho tài nguyên");
            }
            if (r.getParent() != null) {
                r.setParent(null);
                if (request.getOrderIndex() == null) {
                    int nextRootIdx = Optional.ofNullable(
                            resourceRepository.maxRootOrderIndex(r.getCourse().getId())
                    ).orElse(-1) + 1;
                    r.setOrderIndex(nextRootIdx);
                }
            }
        }
        // 2. Gắn hoặc chuyển tài nguyên sang bài học / chương khác
        else if (request.getParentId() != null) {
            CourseResource newParent = getOrThrow(request.getParentId());
            if (!newParent.getCourse().getId().equals(r.getCourse().getId())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Parent thuộc course khác");
            }
            if (newParent.getId().equals(r.getId())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể gán resource vào chính nó");
            }
            validateHierarchy(newParent.getResourceType(), r.getResourceType());

            boolean isParentChanged = r.getParent() == null || !r.getParent().getId().equals(newParent.getId());
            r.setParent(newParent);
            if (isParentChanged && request.getOrderIndex() == null) {
                int nextChildIdx = Optional.ofNullable(
                        resourceRepository.maxChildOrderIndex(newParent.getId())
                ).orElse(-1) + 1;
                r.setOrderIndex(nextChildIdx);
            }
        }

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
        if (request.getHashtagFilter() != null)    r.setHashtagFilter(request.getHashtagFilter());
        if (request.getTotalQuestions() != null)   r.setTotalQuestions(request.getTotalQuestions());
        if (request.getShuffleQuestions() != null) r.setShuffleQuestions(request.getShuffleQuestions());

        CourseResource saved = resourceRepository.save(r);
        triggerRecalcIfRequired(saved);
        notifyStudentsIfMandatoryQuizPublished(saved, previousStatus);
        auditLogService.log("UPDATE", "RESOURCE", id, null);
        return mapper.toCourseResourceResponse(saved);
    }

    /**
     * Kiểm tra request chỉ thay đổi trạng thái (và/hoặc lịch mở/đóng) của Quiz,
     * không đụng tới cấu trúc hay đề thi đã duyệt.
     */
    private boolean isQuizStatusOnlyUpdate(ResourceUpdateRequest req) {
        boolean hasStatusOrSchedule = req.getStatus() != null
                || req.getAvailableFrom() != null
                || req.getAvailableUntil() != null;

        boolean hasStructuralOrContentChange = Boolean.TRUE.equals(req.getDetachParent())
                || req.getParentId() != null
                || (req.getTitle() != null && !req.getTitle().isBlank())
                || req.getDescription() != null
                || req.getOrderIndex() != null
                || req.getIsRequired() != null
                || req.getIsFreePreview() != null
                || req.getDuration() != null
                || req.getContent() != null
                || req.getThumbnailUrl() != null
                || req.getFileName() != null
                || req.getFileUrl() != null
                || req.getFileSize() != null
                || req.getFileFormat() != null
                || req.getMimeType() != null
                || req.getMaxAttempts() != null
                || req.getPassingScore() != null
                || req.getTimeLimit() != null
                || req.getPoints() != null
                || req.getDeadline() != null
                || req.getSettings() != null
                || req.getQuizCategory() != null
                || req.getHashtagFilter() != null
                || req.getTotalQuestions() != null
                || req.getShuffleQuestions() != null;

        return hasStatusOrSchedule && !hasStructuralOrContentChange;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        CourseResource r = getOrThrow(id);
        assertCourseEditable(r.getCourse());

        if (resourceRepository.existsByParent_Id(id)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể xóa — còn resource con");
        }
        boolean needRecalc = Boolean.TRUE.equals(r.getIsRequired())
                && (r.getCourse().getStatus() == CourseStatus.PUBLISHED || r.getCourse().getStatus() == CourseStatus.ONGOING);
        Long courseIdForRecalc = r.getCourse().getId();
        resourceRepository.delete(r);
        auditLogService.log("DELETE", "RESOURCE", id, null);
        if (needRecalc) progressCalculationService.onResourceChanged(courseIdForRecalc);
    }

    @Override
    @Transactional
    public void reorder(Long courseId, ResourceReorderRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        assertCourseEditable(course);

        List<CourseResource> toUpdate = new ArrayList<>();
        Map<Long, Set<Integer>> usedIndices = new HashMap<>();

        for (ResourceReorderRequest.ReorderItem item : request.getItems()) {
            CourseResource r = getOrThrow(item.getId());
            if (!r.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Resource " + item.getId() + " không thuộc khóa học này");
            }
            Long parentKey = r.getParent() != null ? r.getParent().getId() : -1L;
            Set<Integer> indices = usedIndices.computeIfAbsent(parentKey, k -> new HashSet<>());
            if (!indices.add(item.getOrderIndex())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Trùng orderIndex " + item.getOrderIndex() + " trong cùng parent");
            }
            r.setOrderIndex(item.getOrderIndex());
            toUpdate.add(r);
        }

        resourceRepository.saveAll(toUpdate);
        auditLogService.log("REORDER", "RESOURCE", courseId, "Cập nhật thứ tự " + toUpdate.size() + " resource");
        log.info("Reorder course {}: {} resource", courseId, toUpdate.size());
    }

    private CourseResource getOrThrow(Long id) {
        return resourceRepository.findById(id).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Resource không tồn tại"));
    }

    private void assertCourseEditable(Course course) {
        if (course.getStatus() != CourseStatus.DRAFT) {
            String hint = (course.getStatus() == CourseStatus.PENDING_REVIEW)
                    ? " Vui lòng thu hồi yêu cầu kiểm duyệt (POST /api/courses/" + course.getId() + "/withdraw-review) trước khi sửa."
                    : "";
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể thay đổi RESOURCE khi khóa học ở trạng thái " + course.getStatus() + ". Chỉ DRAFT mới được sửa." + hint);
        }
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
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, String.format("Không thể đặt %s dưới %s", childType, parentType));
        }
    }

    private void triggerRecalcIfRequired(CourseResource r) {
        if (!Boolean.TRUE.equals(r.getIsRequired())) return;
        var status = r.getCourse().getStatus();
        if (status == CourseStatus.PUBLISHED || status == CourseStatus.ONGOING) {
            progressCalculationService.onResourceChanged(r.getCourse().getId());
        }
    }

    /**
     * Gửi thông báo cho các học viên đang học (ACTIVE) khi một Quiz bắt buộc
     * vừa được chuyển sang trạng thái công khai (PUBLISHED).
     */
    private void notifyStudentsIfMandatoryQuizPublished(CourseResource resource, ResourceStatus previousStatus) {
        if (resource.getResourceType() != ResourceType.QUIZ) return;

        boolean isMandatory = resource.getQuizCategory() == QuizCategory.MANDATORY
                || Boolean.TRUE.equals(resource.getIsRequired());
        if (!isMandatory) return;

        boolean justPublished = previousStatus != ResourceStatus.PUBLISHED
                && resource.getStatus() == ResourceStatus.PUBLISHED;
        if (!justPublished) return;

        Course course = resource.getCourse();
        if (course.getStatus() != CourseStatus.PUBLISHED && course.getStatus() != CourseStatus.ONGOING) {
            return;
        }

        List<Enrollment> activeEnrollments = enrollmentRepository.findByCourseIdAndStatus(
                course.getId(),
                EnrollmentStatus.ACTIVE
        );
        if (activeEnrollments.isEmpty()) return;

        List<Long> studentIds = activeEnrollments.stream()
                .map(Enrollment::getStudentId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (studentIds.isEmpty()) return;

        List<Long> receiverAccountIds = studentRepository.findAllById(studentIds).stream()
                .map(Student::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (receiverAccountIds.isEmpty()) return;

        Long senderAccountId = null;
        try {
            senderAccountId = SecurityUtils.requireCurrentAccountId();
        } catch (Exception ignored) {
        }

        NotificationRequest notifRequest = NotificationRequest.builder()
                .senderAccountId(senderAccountId)
                .receiverAccountIds(receiverAccountIds)
                .notificationType("QUIZ")
                .title("Bài kiểm tra bắt buộc mới: " + resource.getTitle())
                .content(String.format(
                        "Khóa học \"%s\" vừa mở bài kiểm tra bắt buộc \"%s\". Vui lòng vào hoàn thành.",
                        course.getTitle(),
                        resource.getTitle()
                ))
                .referenceType("COURSE_RESOURCE")
                .referenceId(resource.getId())
                .extraData(Map.of(
                        "courseId", course.getId(),
                        "resourceId", resource.getId(),
                        "url", "/student/courses/" + course.getId() + "/learn?resourceId=" + resource.getId()
                ))
                .priority("HIGH")
                .sendPush(true)
                .build();

        try {
            notificationService.sendNotification(notifRequest);
        } catch (Exception e) {
            log.warn("[Notification] Không thể gửi thông báo mở Quiz bắt buộc #{}: {}",
                    resource.getId(), e.getMessage());
        }
    }
}