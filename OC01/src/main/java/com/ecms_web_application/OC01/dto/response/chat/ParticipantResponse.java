package com.ecms_web_application.OC01.dto.response.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ParticipantResponse {

    private Long id;
    private Long conversationId;
    private Long accountId;
    private String username;
    private String fullName;
    private String avatarUrl;

    // Vai trò + trạng thái chat
    private String roleInConversation;
    private String chatStatus;
    private Boolean isAdmin;

    // Moderation
    private LocalDateTime mutedUntil;
    private String mutedReason;
    private String banReason;

    // Read tracking
    private Integer unreadCount;
    private Long lastReadMessageId;

    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
}