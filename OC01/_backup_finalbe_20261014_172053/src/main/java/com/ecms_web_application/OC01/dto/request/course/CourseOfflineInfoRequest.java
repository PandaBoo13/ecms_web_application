package com.ecms_web_application.OC01.dto.request.course;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Setter @Getter
public class CourseOfflineInfoRequest {

    @NotNull @Min(1) private Integer minStudents;
    @NotNull @Min(1) private Integer maxStudents;
    @NotNull @FutureOrPresent private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @NotEmpty private List<Integer> scheduleDays;
    @NotNull private LocalTime sessionStartTime;
    @NotNull private LocalTime sessionEndTime;
    private Long teacherId;
    private Long roomId;
}