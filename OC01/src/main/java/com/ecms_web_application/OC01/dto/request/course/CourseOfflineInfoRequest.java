package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Setter @Getter
public class CourseOfflineInfoRequest {

    @Min(1) private Integer minStudents;
    @Min(1) private Integer maxStudents;
    @FutureOrPresent private LocalDate startDate;
    private LocalDate endDate;
    private List<Integer> scheduleDays;
    private LocalTime sessionStartTime;
    private LocalTime sessionEndTime;
    private Long teacherId;
    private Long roomId;
}