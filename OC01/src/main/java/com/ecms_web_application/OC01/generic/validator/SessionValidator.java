package com.ecms_web_application.OC01.generic.validator;

import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Validator cho Session — không truy cập DB.
 */
@Slf4j
@Component
public class SessionValidator {

    public void validateForCreate(SessionCreateRequest req, Long courseTeacherId) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Title session không được rỗng");
        }
        validateTiming(req.getStartTime(), req.getEndTime());

        if (req.getTeacherId() == null && courseTeacherId == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Không xác định được GV chính — course chưa có teacher");
        }

        // GV dạy thay trùng GV chính → chuẩn hóa về null
        Long effectiveTeacherId = req.getTeacherId() != null
                ? req.getTeacherId() : courseTeacherId;
        if (Objects.equals(req.getSubstituteTeacherId(), effectiveTeacherId)) {
            req.setSubstituteTeacherId(null);
        }
    }

    public void validateTiming(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "startTime/endTime là bắt buộc");
        }
        if (!start.isBefore(end)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "startTime phải < endTime");
        }
    }
}