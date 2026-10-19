package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Setter @Getter
public class CourseResponse {
    private Long id;
    private String code;
    private String displayCode;
    private String title;
    private String slug;
    private String shortDescription;
    private String thumbnailUrl;
    private BigDecimal price;
    private BigDecimal oldPrice;
    private Boolean isFree;
    private String courseType;
    private String progressType;
    private String status;
    private String classStatus;
    private Long teacherId;
    private String teacherName;
    private Long createdById;
    private Long categoryId;
    private String categoryName;
    private Long roomId;
    private String roomName;
    private Integer minStudents;
    private Integer maxStudents;
    private Integer currentStudents;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Integer> scheduleDays;
    private LocalTime sessionStartTime;
    private LocalTime sessionEndTime;
    private Long copiedFromCourseId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String learningMode;
    private List<Long> allowedRoomIds;
}