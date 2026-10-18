package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.chat.AddParticipantRequest;
import com.ecms_web_application.OC01.dto.request.chat.CreateConversationRequest;
import com.ecms_web_application.OC01.dto.request.chat.SendMessageRequest;
import com.ecms_web_application.OC01.dto.response.chat.ConversationResponse;
import com.ecms_web_application.OC01.dto.response.chat.MessageResponse;
import com.ecms_web_application.OC01.dto.response.chat.ParticipantResponse;
import com.ecms_web_application.OC01.dto.response.chat.UserSearchResponse;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatService {

    // ==================== CONVERSATION ====================

    ConversationResponse createConversation(CreateConversationRequest request);

    Page<ConversationResponse> getMyConversations(int page, int size);

    ConversationResponse getConversationById(Long conversationId);

    void updateConversationName(Long conversationId, String newName);

    void updateMessagePermission(Long conversationId, String permission);

    // ==================== PARTICIPANT ====================

    List<ParticipantResponse> getParticipants(Long conversationId);

    List<ParticipantResponse> addParticipants(Long conversationId, AddParticipantRequest request);

    void removeParticipant(Long conversationId, Long targetAccountId);

    /** Gán role: ADMIN | MODERATOR | MEMBER */
    void updateParticipantRole(Long conversationId, Long targetAccountId, String role);

    void muteParticipant(Long conversationId, Long targetAccountId,
                         LocalDateTime mutedUntil, String reason);

    void unmuteParticipant(Long conversationId, Long targetAccountId);

    void banParticipant(Long conversationId, Long targetAccountId, String reason);

    void unbanParticipant(Long conversationId, Long targetAccountId);

    void transferOwnership(Long conversationId, Long newOwnerAccountId);

    // ==================== MESSAGE ====================

    MessageResponse sendMessage(Long conversationId, SendMessageRequest request);

    List<MessageResponse> getMessages(Long conversationId, int page, int size);

    void markAsRead(Long conversationId, Long lastReadMessageId);

    MessageResponse editMessage(Long messageId, String newContent);

    void deleteMessage(Long messageId);

    // ==================== PERSONAL PREFERENCES ====================

    void pinConversation(Long conversationId, boolean pinned);

    void muteConversationByUser(Long conversationId, boolean muted);

    void archiveConversation(Long conversationId, boolean archived);

    // ==================== SEARCH ====================

    List<UserSearchResponse> searchUsers(String keyword);
}