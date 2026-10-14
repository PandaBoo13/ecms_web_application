package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Setter @Getter
@Entity
@Table(name = "room",
       uniqueConstraints = @UniqueConstraint(name = "uk_room_code", columnNames = "code"))
public class Room {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 50) private String code;
    @Column(nullable = false, length = 100) private String name;
    private Integer capacity;
    @Column(length = 255) private String location;
    @Column(name = "is_active", nullable = false) private Boolean isActive = true;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (isActive == null) isActive = true;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}