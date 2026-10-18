package com.ecms_web_application.OC01.dto.response.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConversationResponse {

    private Long id;
    private String conversationType;
    private String name;
    private Long courseId;
    private Long createdBy;
    private Long lastMessageId;
    private LocalDateTime lastMessageAt;
    private String messagePermission;
    private String privateChatKey;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ===== Trạng thái riêng của current user =====
    private Integer unreadCount;
    private String lastMessagePreview;
    private Boolean isPinned;
    private Boolean isMutedByUser;
    private Boolean isArchived;

    // ===== Chỉ trả về ở GET /conversations/{id} =====
    private List<ParticipantInfo> participants;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ParticipantInfo {
        private Long accountId;
        private String username;
        private String fullName;
        private String avatarUrl;
        private Boolean isAdmin;
        private String roleInConversation;
    }
}