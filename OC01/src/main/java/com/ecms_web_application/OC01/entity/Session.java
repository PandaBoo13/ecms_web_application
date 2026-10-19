package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Setter @Getter
@Entity
@Table(name = "session",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_session_number",
        columnNames = {"course_id", "session_number"}),
    indexes = {
        @Index(name = "idx_session_effective_teacher", columnList = "effective_teacher_id"),
        @Index(name = "idx_session_effective_room",    columnList = "effective_room_id"),
        @Index(name = "idx_session_busy_teacher",
               columnList = "effective_teacher_id, session_date, status"),
        @Index(name = "idx_session_busy_room",
               columnList = "effective_room_id, session_date, status")
    })
public class Session {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "session_number", nullable = false)
    private Integer sessionNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Account teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "substitute_teacher_id")
    private Account substituteTeacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assistant_id")
    private Account assistant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "effective_room_id")
    private Long effectiveRoomId;

    @Column(name = "effective_teacher_id", insertable = false, updatable = false)
    private Long effectiveTeacherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status = SessionStatus.SCHEDULED;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "rescheduled_from_id")
    private Long rescheduledFromId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = SessionStatus.SCHEDULED;
        syncDerivedFields();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        syncDerivedFields();
    }

    private void syncDerivedFields() {
        if (this.sessionDate == null && this.startTime != null) {
            this.sessionDate = this.startTime.toLocalDate();
        }
        this.effectiveRoomId = (this.room != null)
                ? this.room.getId()
                : (this.course != null && this.course.getRoom() != null
                    ? this.course.getRoom().getId() : null);

        if (this.substituteTeacher != null && this.teacher != null
                && this.substituteTeacher.getId() != null
                && this.substituteTeacher.getId().equals(this.teacher.getId())) {
            this.substituteTeacher = null;
        }
    }
}