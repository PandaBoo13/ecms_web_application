package com.ecms_web_application.OC01.dto.request.enrollment;

import com.ecms_web_application.OC01.entity.enums.AttendanceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class SaveSessionAttendanceRequest {
    @NotNull
    @Valid
    private List<Record> records;

    @Data
    public static class Record {
        @NotNull
        private Long enrollmentId;

        @NotNull
        private AttendanceStatus status;

        private LocalDateTime checkInAt;

        @Size(max = 2000)
        private String note;
    }
}
