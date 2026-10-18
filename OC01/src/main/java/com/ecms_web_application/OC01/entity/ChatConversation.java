package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.ConversationTypeEnum;
import com.ecms_web_application.OC01.entity.enums.MessagePermissionEnum;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "chat_conversation")
public class ChatConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "conversation_type",
            columnDefinition = "conversation_type_enum",
            nullable = false)
    private ConversationTypeEnum conversationType = ConversationTypeEnum.PRIVATE;

    @Column(length = 255)
    private String name;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "last_message_id")
    private Long lastMessageId;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "message_permission",
            columnDefinition = "message_permission_enum",
            nullable = false)
    private MessagePermissionEnum messagePermission = MessagePermissionEnum.EVERYONE;

    @Column(name = "private_chat_key", unique = true, length = 50)
    private String privateChatKey;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (conversationType == null) conversationType = ConversationTypeEnum.PRIVATE;
        if (messagePermission == null) messagePermission = MessagePermissionEnum.EVERYONE;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}