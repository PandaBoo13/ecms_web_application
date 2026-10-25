package com.ecms_web_application.OC01.generic.validator;

import com.ecms_web_application.OC01.dto.request.course.CourseCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.CourseOfflineInfoRequest;
import com.ecms_web_application.OC01.dto.request.course.CourseUpdateRequest;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/**
 * Validator cho Course — không truy cập DB.
 */
@Slf4j
@Component
public class CourseValidator {

    private static final Set<String> ALLOWED_LEARNING_MODES =
            Set.of("AUTONOMOUS", "SEQUENTIAL");

    public void validateForCreate(CourseCreateRequest req) {
        validatePrice(req.getPrice(), req.getOldPrice());
        validateLearningMode(req.getLearningMode());
        validateAllowedRoomIds(req.getAllowedRoomIds());
    }

    public void validateForUpdate(CourseUpdateRequest req) {
        validatePrice(req.getPrice(), req.getOldPrice());
        validateLearningMode(req.getLearningMode());
        validateAllowedRoomIds(req.getAllowedRoomIds());
    }

    public void validateForOfflineInfo(CourseOfflineInfoRequest req) {
        if (req.getStartDate() != null && req.getEndDate() != null
                && req.getStartDate().isAfter(req.getEndDate())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu phải <= ngày kết thúc");
        }
        if (req.getMinStudents() != null && req.getMaxStudents() != null
                && req.getMaxStudents() < req.getMinStudents()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "max_students phải >= min_students");
        }
        if (req.getSessionStartTime() != null && req.getSessionEndTime() != null
                && !req.getSessionStartTime().isBefore(req.getSessionEndTime())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "session_start_time phải < session_end_time");
        }
        if (req.getScheduleDays() == null || req.getScheduleDays().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "schedule_days không được rỗng");
        }
        for (Integer d : req.getScheduleDays()) {
            if (d == null || d < 1 || d > 7) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "schedule_days chỉ chấp nhận giá trị 1..7 (CN..T7)");
            }
        }
    }

    private void validatePrice(BigDecimal price, BigDecimal oldPrice) {
        if (price != null && price.signum() < 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "price phải >= 0");
        }
        if (oldPrice != null && oldPrice.signum() < 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "old_price phải >= 0");
        }
    }

    private void validateLearningMode(String learningMode) {
        if (learningMode == null || learningMode.isBlank()) return;
        if (!ALLOWED_LEARNING_MODES.contains(learningMode.trim().toUpperCase())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "learning_mode chỉ chấp nhận: AUTONOMOUS, SEQUENTIAL");
        }
    }

    private void validateAllowedRoomIds(List<Long> ids) {
        if (ids == null) return;
        for (Long id : ids) {
            if (id == null || id <= 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "allowed_room_ids chứa giá trị không hợp lệ");
            }
        }
    }
}