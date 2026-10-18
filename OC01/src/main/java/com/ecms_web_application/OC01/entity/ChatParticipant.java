package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.ChatStatusEnum;
import com.ecms_web_application.OC01.entity.enums.ParticipantRoleEnum;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "chat_participant",
       uniqueConstraints = @UniqueConstraint(
           name = "uk_participant_conv_acc",
           columnNames = {"conversation_id", "account_id"}))
public class ChatParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "role_in_conversation",
            columnDefinition = "participant_role_enum",
            nullable = false)
    private ParticipantRoleEnum roleInConversation = ParticipantRoleEnum.MEMBER;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "chat_status",
            columnDefinition = "chat_status_enum",
            nullable = false)
    private ChatStatusEnum chatStatus = ChatStatusEnum.ACTIVE;

    @Column(name = "muted_until")
    private LocalDateTime mutedUntil;

    @Column(name = "muted_reason", length = 255)
    private String mutedReason;

    @Column(name = "ban_reason", length = 255)
    private String banReason;

    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin = false;

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId;

    @Column(name = "unread_count", nullable = false)
    private Integer unreadCount = 0;

    @Column(name = "last_message_preview", length = 255)
    private String lastMessagePreview;

    @Column(name = "is_muted_by_user", nullable = false)
    private Boolean isMutedByUser = false;

    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived = false;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (joinedAt == null) joinedAt = now;
        updatedAt = now;
        if (roleInConversation == null) roleInConversation = ParticipantRoleEnum.MEMBER;
        if (chatStatus == null) chatStatus = ChatStatusEnum.ACTIVE;
        if (unreadCount == null) unreadCount = 0;
        if (isAdmin == null) isAdmin = false;
        if (isMutedByUser == null) isMutedByUser = false;
        if (isPinned == null) isPinned = false;
        if (isArchived == null) isArchived = false;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}