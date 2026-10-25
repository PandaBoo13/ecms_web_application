package com.ecms_web_application.OC01.dto.response.course;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Setter @Getter
public class SessionResponse {
    private Long id;
    private Long courseId;
    private Integer sessionNumber;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long teacherId;
    private String teacherName;
    private Long assistantId;
    private String assistantName;
    private Long roomId;
    private String roomName;
    private String status;
    private String cancelReason;
    private String note;
    private Long rescheduledFromId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDate sessionDate;
    private Long substituteTeacherId;
    private String substituteTeacherName;
    private Long effectiveTeacherId;
    private String effectiveTeacherName;
    private Long effectiveRoomId;
    private String effectiveRoomName;
}