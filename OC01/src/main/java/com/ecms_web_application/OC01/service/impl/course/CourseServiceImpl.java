package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.course.*;
import com.ecms_web_application.OC01.dto.response.course.*;
import com.ecms_web_application.OC01.entity.*;
import com.ecms_web_application.OC01.entity.enums.*;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final RoomRepository roomRepository;
    private final AuditLogService auditLogService;

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");

    @Override
    @Transactional
    public CourseResponse create(CourseCreateRequest request) {
        Account current = SecurityUtils.requireCurrentAccount();
        String typeCode = (request.getCourseType() == CourseType.OFFLINE) ? "OFF" : "ONL";
        String code = generateCode(typeCode);
        String slug = generateUniqueSlug(slugify(request.getTitle()), null);

        Course c = new Course();
        c.setCode(code);
        c.setSlug(slug);
        c.setDisplayCode(code);
        c.setTitle(request.getTitle().trim());
        c.setShortDescription(request.getShortDescription());
        c.setDescription(request.getDescription());
        c.setThumbnailUrl(request.getThumbnailUrl());
        c.setOutcomes(request.getOutcomes());
        c.setPrice(request.getPrice() == null ? BigDecimal.ZERO : request.getPrice());
        c.setOldPrice(request.getOldPrice());
        c.setIsFree(Boolean.TRUE.equals(request.getIsFree()));
        c.setCourseType(request.getCourseType());
        c.setProgressType(request.getCourseType() == CourseType.OFFLINE
                ? ProgressType.SESSION_BASED : ProgressType.COMPLETION_BASED);
        c.setStatus(CourseStatus.DRAFT);
        c.setTeacher(resolveTeacher(request.getTeacherId(), current));
        c.setCreatedBy(current);
        if (request.getCategoryId() != null) {
            c.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Danh mục không tồn tại")));
        }
        if (request.getRoomId() != null) {
            c.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }

        Course saved = courseRepository.save(c);
        auditLogService.log("CREATE", "COURSE", saved.getId(), "Tạo khóa: " + saved.getTitle());
        log.info("Tạo course id={}, code={}", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseDetailResponse getById(Long id) {
        Course c = courseRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        CourseDetailResponse res = new CourseDetailResponse();
        copyToResponse(c, res);
        res.setDescription(c.getDescription());
        res.setOutcomes(c.getOutcomes());
        res.setResources(resourceRepository.findByCourse_IdOrderByOrderIndexAsc(id)
                .stream().map(this::toResourceResponse).toList());
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseResponse> search(String status, String type, Long teacherId,
                                       Long categoryId, String search, Pageable pageable) {
        CourseStatus st = StringUtils.hasText(status) ? CourseStatus.valueOf(status.toUpperCase()) : null;
        CourseType tp = StringUtils.hasText(type) ? CourseType.valueOf(type.toUpperCase()) : null;
        String kw = StringUtils.hasText(search) ? search.trim() : "";
        return courseRepository.searchCourses(st, tp, teacherId, categoryId, kw, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public CourseResponse update(Long id, CourseUpdateRequest request) {
        Course c = getCourseOrThrow(id);
        assertCanEdit(c);

        if (StringUtils.hasText(request.getTitle())) {
            c.setTitle(request.getTitle().trim());
            c.setSlug(generateUniqueSlug(slugify(request.getTitle()), id));
        }
        if (request.getShortDescription() != null) {
            if (request.getShortDescription().length() > 500) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mô tả ngắn không vượt quá 500 ký tự");
            }
            c.setShortDescription(request.getShortDescription());
        }
        if (request.getDescription() != null) c.setDescription(request.getDescription());
        if (request.getThumbnailUrl() != null) c.setThumbnailUrl(request.getThumbnailUrl());
        if (request.getOutcomes() != null) c.setOutcomes(request.getOutcomes());
        if (request.getPrice() != null) {
            if (request.getPrice().signum() < 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Giá phải >= 0");
            }
            c.setPrice(request.getPrice());
        }
        if (request.getOldPrice() != null) c.setOldPrice(request.getOldPrice());
        if (request.getIsFree() != null) c.setIsFree(request.getIsFree());
        if (request.getCategoryId() != null) {
            c.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Danh mục không tồn tại")));
        }
        if (request.getRoomId() != null) {
            c.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }

        Course saved = courseRepository.save(c);
        auditLogService.log("UPDATE", "COURSE", id, "Cập nhật khóa học");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse updateOfflineInfo(Long id, CourseOfflineInfoRequest request) {
        Course c = getCourseOrThrow(id);
        assertCanEdit(c);

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải <= ngày kết thúc");
        }
        if (request.getMaxStudents() < request.getMinStudents()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "max_students phải >= min_students");
        }
        if (!request.getSessionStartTime().isBefore(request.getSessionEndTime())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "session_start_time phải < session_end_time");
        }
        if (request.getScheduleDays() == null || request.getScheduleDays().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "schedule_days không được rỗng");
        }

        c.setMinStudents(request.getMinStudents());
        c.setMaxStudents(request.getMaxStudents());
        c.setStartDate(request.getStartDate());
        c.setEndDate(request.getEndDate());
        c.setScheduleDays(request.getScheduleDays());
        c.setSessionStartTime(request.getSessionStartTime());
        c.setSessionEndTime(request.getSessionEndTime());
        c.setCourseType(CourseType.OFFLINE);
        c.setProgressType(ProgressType.SESSION_BASED);
        c.setClassStatus(ClassStatus.PLANNED);
        if (request.getTeacherId() != null) {
            c.setTeacher(accountRepository.findById(request.getTeacherId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại")));
        }
        if (request.getRoomId() != null) {
            c.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }

        Course saved = courseRepository.save(c);
        auditLogService.log("UPDATE_OFFLINE", "COURSE", id, "Chuyển OFFLINE");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse submitForReview(Long id) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ submit khóa ở DRAFT");
        }
        validateBeforeSubmit(c);
        c.setStatus(CourseStatus.PENDING_REVIEW);
        Course saved = courseRepository.save(c);
        auditLogService.log("SUBMIT_REVIEW", "COURSE", id, null);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse review(Long id, CourseReviewRequest request) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.PENDING_REVIEW) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ duyệt khóa ở PENDING_REVIEW");
        }
        if (Boolean.TRUE.equals(request.getApproved())) {
            c.setStatus(CourseStatus.PUBLISHED);
            if (c.getCourseType() == CourseType.OFFLINE && c.getClassStatus() == null) {
                c.setClassStatus(ClassStatus.PLANNED);
            }
        } else {
            if (!StringUtils.hasText(request.getRejectReason())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lý do từ chối là bắt buộc");
            }
            c.setStatus(CourseStatus.DRAFT);
        }
        Course saved = courseRepository.save(c);
        auditLogService.log(Boolean.TRUE.equals(request.getApproved()) ? "APPROVE" : "REJECT",
                "COURSE", id, request.getRejectReason());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse archive(Long id) {
        Course c = getCourseOrThrow(id);
        c.setStatus(CourseStatus.ARCHIVED);
        Course saved = courseRepository.save(c);
        auditLogService.log("ARCHIVE", "COURSE", id, null);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse cancel(Long id, String reason) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() == CourseStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa đã bị hủy");
        }
        if (!StringUtils.hasText(reason)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lý do hủy là bắt buộc");
        }
        c.setStatus(CourseStatus.CANCELLED);
        if (c.getCourseType() == CourseType.OFFLINE) c.setClassStatus(ClassStatus.CANCELLED);
        Course saved = courseRepository.save(c);
        auditLogService.log("CANCEL", "COURSE", id, reason);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public CourseDetailResponse copy(Long sourceCourseId, CourseCopyRequest request) {
        Course src = courseRepository.findByIdWithRelations(sourceCourseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa gốc không tồn tại"));
        if (courseRepository.existsByDisplayCode(request.getNewDisplayCode())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "display_code đã tồn tại");
        }
        Account current = SecurityUtils.requireCurrentAccount();
        String typeCode = src.getCourseType() == CourseType.OFFLINE ? "OFF" : "ONL";
        String code = generateCode(typeCode);
        String slug = generateUniqueSlug(slugify(request.getNewTitle()), null);

        Course copy = new Course();
        copy.setCode(code);
        copy.setSlug(slug);
        copy.setDisplayCode(request.getNewDisplayCode());
        copy.setTitle(request.getNewTitle());
        copy.setShortDescription(src.getShortDescription());
        copy.setDescription(src.getDescription());
        copy.setThumbnailUrl(src.getThumbnailUrl());
        copy.setOutcomes(src.getOutcomes());
        copy.setPrice(Boolean.TRUE.equals(request.getResetPrice()) ? BigDecimal.ZERO : src.getPrice());
        copy.setOldPrice(src.getOldPrice());
        copy.setIsFree(src.getIsFree());
        copy.setCourseType(src.getCourseType());
        copy.setProgressType(src.getProgressType());
        copy.setStatus(CourseStatus.DRAFT);
        copy.setCategory(src.getCategory());
        copy.setTeacher(src.getTeacher());
        copy.setCreatedBy(current);
        copy.setCopiedFromCourseId(src.getId());
        Course savedCopy = courseRepository.save(copy);

        Map<Long, CourseResource> idMap = new HashMap<>();
        for (CourseResource srcR : resourceRepository.findByCourse_IdOrderByOrderIndexAsc(src.getId())) {
            CourseResource newR = new CourseResource();
            newR.setCourse(savedCopy);
            newR.setParent(srcR.getParent() != null ? idMap.get(srcR.getParent().getId()) : null);
            newR.setResourceType(srcR.getResourceType());
            newR.setTitle(srcR.getTitle());
            newR.setDescription(srcR.getDescription());
            newR.setOrderIndex(srcR.getOrderIndex());
            newR.setIsRequired(srcR.getIsRequired());
            newR.setIsFreePreview(srcR.getIsFreePreview());
            newR.setDuration(srcR.getDuration());
            newR.setFileUrl(srcR.getFileUrl());
            newR.setFileName(srcR.getFileName());
            newR.setFileSize(srcR.getFileSize());
            newR.setFileFormat(srcR.getFileFormat());
            newR.setMimeType(srcR.getMimeType());
            newR.setThumbnailUrl(srcR.getThumbnailUrl());
            newR.setContent(srcR.getContent());
            newR.setMaxAttempts(srcR.getMaxAttempts());
            newR.setPassingScore(srcR.getPassingScore());
            newR.setTimeLimit(srcR.getTimeLimit());
            newR.setPoints(srcR.getPoints());
            newR.setSettings(srcR.getSettings());
            newR.setStatus(ResourceStatus.DRAFT);
            newR.setQuizCategory(srcR.getQuizCategory());
            newR.setCreatedBy(current);
            idMap.put(srcR.getId(), resourceRepository.save(newR));
        }

        auditLogService.log("COPY", "COURSE", savedCopy.getId(), "Copy từ course " + src.getId());
        log.info("Copy course {} → {}", src.getId(), savedCopy.getId());
        return getById(savedCopy.getId());
    }

    @Override
    @Transactional
    public void softDelete(Long id) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.ARCHIVED && c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ xóa mềm khóa DRAFT/ARCHIVED");
        }
        c.setDeletedAt(LocalDateTime.now());
        courseRepository.save(c);
        auditLogService.log("SOFT_DELETE", "COURSE", id, null);
    }

    @Override
    @Transactional
    public void hardDelete(Long id) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ xóa cứng khóa DRAFT");
        }
        courseRepository.delete(c);
        auditLogService.log("HARD_DELETE", "COURSE", id, null);
    }

    private Course getCourseOrThrow(Long id) {
        return courseRepository.findById(id)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
    }

    private void assertCanEdit(Course c) {
        if (c.getStatus() == CourseStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa đã hủy, không thể sửa");
        }
    }

    private Account resolveTeacher(Long teacherId, Account current) {
        if (teacherId != null) {
            return accountRepository.findById(teacherId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Giảng viên không tồn tại"));
        }
        return current;
    }

    private void validateBeforeSubmit(Course c) {
        if (c.getPrice().signum() <= 0 && !Boolean.TRUE.equals(c.getIsFree())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Giá phải > 0 hoặc is_free = true");
        }
        if (c.getCourseType() == CourseType.ONLINE) {
            long chapters = resourceRepository.countByCourse_IdAndResourceType(c.getId(), ResourceType.CHAPTER);
            if (chapters == 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Cần ít nhất 1 Chapter");
            }
        }
    }

    private String generateCode(String typeCode) {
        String ym = DateTimeFormatter.ofPattern("yyyyMM").format(java.time.LocalDate.now());
        long count = courseRepository.count() + 1;
        return String.format("CRS-%s-%s-%03d", typeCode, ym, count);
    }

    private String generateUniqueSlug(String base, Long excludeId) {
        String s = base;
        int i = 1;
        while (excludeId == null ? courseRepository.existsBySlug(s)
                : courseRepository.existsBySlugAndIdNot(s, excludeId)) {
            s = base + "-" + i++;
        }
        return s;
    }

    private String slugify(String input) {
        if (input == null) return "";
        String temp = Normalizer.normalize(input, Normalizer.Form.NFD);
        temp = temp.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        temp = temp.replaceAll("đ", "d").replaceAll("Đ", "D");
        temp = temp.toLowerCase(Locale.ROOT);
        temp = NON_ALNUM.matcher(temp).replaceAll("-");
        return temp.replaceAll("^-+|-+$", "");
    }

    private CourseResponse toResponse(Course c) {
        CourseResponse r = new CourseResponse();
        copyToResponse(c, r);
        return r;
    }

    private void copyToResponse(Course c, CourseResponse r) {
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
        r.setClassStatus(c.getClassStatus() != null ? c.getClassStatus().name() : null);
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
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
    }

    private CourseResourceResponse toResourceResponse(CourseResource r) {
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
}