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
public class MessageResponse {

    private Long id;
    private Long conversationId;

    // Sender
    private Long senderId;
    private String senderName;
    private String senderAvatarUrl;

    // Content
    private String messageType;
    private String content;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private String fileFormat;

    // Reply - flatten để FE hiển thị preview
    private Long replyToMessageId;
    private String replyToContent;
    private String replyToSenderName;

    // Flags
    private Boolean isDeleted;
    private Boolean isEdited;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}