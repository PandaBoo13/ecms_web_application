package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.chat.AddParticipantRequest;
import com.ecms_web_application.OC01.dto.request.chat.CreateConversationRequest;
import com.ecms_web_application.OC01.dto.request.chat.SendMessageRequest;
import com.ecms_web_application.OC01.dto.response.chat.ConversationResponse;
import com.ecms_web_application.OC01.dto.response.chat.MessageResponse;
import com.ecms_web_application.OC01.dto.response.chat.ParticipantResponse;
import com.ecms_web_application.OC01.dto.response.chat.UserSearchResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.ChatConversation;
import com.ecms_web_application.OC01.entity.ChatMessage;
import com.ecms_web_application.OC01.entity.ChatParticipant;
import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.enums.ChatStatusEnum;
import com.ecms_web_application.OC01.entity.enums.ConversationTypeEnum;
import com.ecms_web_application.OC01.entity.enums.MessagePermissionEnum;
import com.ecms_web_application.OC01.entity.enums.MessageTypeEnum;
import com.ecms_web_application.OC01.entity.enums.ParticipantRoleEnum;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.ChatConversationRepository;
import com.ecms_web_application.OC01.repository.ChatMessageRepository;
import com.ecms_web_application.OC01.repository.ChatParticipantRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatServiceImpl implements ChatService {

    private final ChatConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatParticipantRepository participantRepo;
    private final AccountRepository accountRepo;
    private final CourseRepository courseRepo;
    private final StudentRepository studentRepo;
    private final SimpMessagingTemplate messagingTemplate;

    // ==================== CONVERSATION ====================

    @Override
    @Transactional
    public ConversationResponse createConversation(CreateConversationRequest request) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ConversationTypeEnum type = parseEnum(ConversationTypeEnum.class, request.getConversationType(),
                "Loại conversation không hợp lệ");

        if (type == ConversationTypeEnum.PRIVATE) {
            return createPrivateConversation(me, request);
        }
        if (type == ConversationTypeEnum.GROUP) {
            return createGroupConversation(me, request);
        }
        return createCourseConversation(me, request);
    }

    private ConversationResponse createPrivateConversation(Long me, CreateConversationRequest req) {
        if (req.getParticipantIds() == null || req.getParticipantIds().size() != 1) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Chat riêng phải có đúng 1 người nhận");
        }
        Long other = req.getParticipantIds().get(0);
        if (other.equals(me)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể tự chat với chính mình");
        }
        if (!accountRepo.existsById(other)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Người nhận không tồn tại");
        }

        String key = Math.min(me, other) + ":" + Math.max(me, other);
        Optional<ChatConversation> existing = conversationRepo.findByPrivateChatKey(key);
        if (existing.isPresent()) {
            return toConversationResponse(existing.get(), me, false);
        }

        ChatConversation conv = new ChatConversation();
        conv.setConversationType(ConversationTypeEnum.PRIVATE);
        conv.setCreatedBy(me);
        conv.setPrivateChatKey(key);
        try {
            conv = conversationRepo.save(conv);
        } catch (DataIntegrityViolationException e) {
            // Race: đã có người khác tạo trước → load lại
            ChatConversation loaded = conversationRepo.findByPrivateChatKey(key)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR,
                            "Lỗi tạo chat riêng"));
            return toConversationResponse(loaded, me, false);
        }

        addParticipant(conv.getId(), me, ParticipantRoleEnum.OWNER);
        addParticipant(conv.getId(), other, ParticipantRoleEnum.MEMBER);

        broadcastNewConversation(conv.getId(), Arrays.asList(me, other));
        return toConversationResponse(conv, me, false);
    }

    private ConversationResponse createGroupConversation(Long me, CreateConversationRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tên nhóm không được để trống");
        }
        ChatConversation conv = new ChatConversation();
        conv.setConversationType(ConversationTypeEnum.GROUP);
        conv.setName(req.getName().trim());
        conv.setCreatedBy(me);
        conv = conversationRepo.save(conv);

        addParticipant(conv.getId(), me, ParticipantRoleEnum.OWNER);
        List<Long> allIds = new ArrayList<>(List.of(me));
        if (req.getParticipantIds() != null) {
            for (Long pid : new LinkedHashSet<>(req.getParticipantIds())) {
                if (pid.equals(me) || !accountRepo.existsById(pid)) continue;
                addParticipant(conv.getId(), pid, ParticipantRoleEnum.MEMBER);
                allIds.add(pid);
            }
        }
        broadcastNewConversation(conv.getId(), allIds);
        return toConversationResponse(conv, me, false);
    }

    private ConversationResponse createCourseConversation(Long me, CreateConversationRequest req) {
        if (req.getCourseId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course chat phải có courseId");
        }
        Course course = courseRepo.findById(req.getCourseId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        boolean isTeacher = course.getTeacher() != null && course.getTeacher().getId().equals(me);
        boolean isCreator = course.getCreatedBy() != null && course.getCreatedBy().getId().equals(me);
        boolean isEnrolledStudent = studentRepo.findAccountIdsByCourseId(req.getCourseId()).contains(me);
        if (!isTeacher && !isCreator && !isEnrolledStudent) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không thuộc khóa học này");
        }
        ChatConversation conv = new ChatConversation();
        conv.setConversationType(ConversationTypeEnum.COURSE);
        conv.setName(req.getName());
        conv.setCourseId(req.getCourseId());
        conv.setCreatedBy(me);
        conv = conversationRepo.save(conv);

        addParticipant(conv.getId(), me, ParticipantRoleEnum.OWNER);
        List<Long> allIds = new ArrayList<>(List.of(me));
        if (req.getParticipantIds() != null) {
            for (Long pid : new LinkedHashSet<>(req.getParticipantIds())) {
                if (pid.equals(me) || !accountRepo.existsById(pid)) continue;
                addParticipant(conv.getId(), pid, ParticipantRoleEnum.MEMBER);
                allIds.add(pid);
            }
        }
        broadcastNewConversation(conv.getId(), allIds);
        return toConversationResponse(conv, me, false);
    }

    @Override
    public Page<ConversationResponse> getMyConversations(int page, int size) {
        Long me = SecurityUtils.requireCurrentAccountId();
        int safeSize = Math.max(1, Math.min(size, 100));
        Page<ChatConversation> pageData = conversationRepo.findMyConversations(
                me, PageRequest.of(page, safeSize));

        // Batch load participants (chỉ cần cho PRIVATE để compute display name)
        List<Long> convIds = pageData.getContent().stream()
                .map(ChatConversation::getId).collect(Collectors.toList());
        Map<Long, List<ChatParticipant>> participantsByConv = convIds.isEmpty() ? Map.of()
                : participantRepo.findByConversationIdInAndLeftAtIsNull(convIds).stream()
                    .collect(Collectors.groupingBy(ChatParticipant::getConversationId));

        // Batch load accounts cho participants
        Set<Long> accountIds = participantsByConv.values().stream()
                .flatMap(List::stream).map(ChatParticipant::getAccountId)
                .collect(Collectors.toSet());
        Map<Long, Account> accountMap = accountIds.isEmpty() ? Map.of()
                : accountRepo.findAllById(accountIds).stream()
                    .collect(Collectors.toMap(Account::getId, a -> a));

        return pageData.map(conv ->
                toConversationResponseWithCache(conv, me,
                        participantsByConv.getOrDefault(conv.getId(), List.of()),
                        accountMap, true));
    }

    @Override
    public ConversationResponse getConversationById(Long conversationId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatConversation conv = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Conversation không tồn tại"));
        requireActiveParticipant(conversationId, me);
        return toConversationResponse(conv, me, true);
    }

    @Override
    @Transactional
    public void updateConversationName(Long conversationId, String newName) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant p = requireActiveParticipant(conversationId, me);
        ChatConversation conv = requireConversation(conversationId);

        if (conv.getConversationType() != ConversationTypeEnum.GROUP) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ đổi tên được nhóm chat (GROUP)");
        }
        if (!isAdminOrOwner(p)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER/ADMIN mới được đổi tên nhóm");
        }
        if (newName == null || newName.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tên nhóm không được để trống");
        }
        if (newName.length() > 255) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tên nhóm không vượt quá 255 ký tự");
        }
        conv.setName(newName.trim());
        conversationRepo.save(conv);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/name-changed",
                Map.of("conversationId", conversationId, "newName", newName.trim()));
    }

    @Override
    @Transactional
    public void updateMessagePermission(Long conversationId, String permission) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant p = requireActiveParticipant(conversationId, me);
        ChatConversation conv = requireConversation(conversationId);

        if (!isAdminOrOwner(p)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN,
                    "Chỉ OWNER/ADMIN mới đổi quyền gửi tin");
        }
        MessagePermissionEnum newPerm = parseEnum(MessagePermissionEnum.class, permission,
                "Quyền gửi tin không hợp lệ");
        conv.setMessagePermission(newPerm);
        conversationRepo.save(conv);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/permission-changed",
                Map.of("messagePermission", newPerm.name()));
    }

    // ==================== PARTICIPANTS ====================

    @Override
    public List<ParticipantResponse> getParticipants(Long conversationId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        requireActiveParticipant(conversationId, me);

        List<ChatParticipant> participants =
                participantRepo.findByConversationIdAndLeftAtIsNull(conversationId);
        return enrichParticipants(participants);
    }

    @Override
    @Transactional
    public List<ParticipantResponse> addParticipants(Long conversationId, AddParticipantRequest request) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        ChatConversation conv = requireConversation(conversationId);

        if (conv.getConversationType() == ConversationTypeEnum.PRIVATE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Private chat không thể thêm thành viên");
        }
        if (!isAdminOrOwner(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER/ADMIN mới thêm thành viên");
        }

        for (Long accId : request.getAccountIds()) {
            if (!accountRepo.existsById(accId)) continue;
            Optional<ChatParticipant> active =
                    participantRepo.findByConversationIdAndAccountIdAndLeftAtIsNull(conversationId, accId);
            if (active.isPresent()) continue;

            // Nếu đã từng rời nhóm → reactivate (giữ lịch sử)
            Optional<ChatParticipant> left =
                    participantRepo.findByConversationIdAndAccountId(conversationId, accId);
            if (left.isPresent()) {
                ChatParticipant p = left.get();
                p.setLeftAt(null);
                p.setJoinedAt(LocalDateTime.now());
                p.setChatStatus(ChatStatusEnum.ACTIVE);
                participantRepo.save(p);
            } else {
                addParticipant(conversationId, accId, ParticipantRoleEnum.MEMBER);
            }

            messagingTemplate.convertAndSend(
                    "/topic/user/" + accId + "/conversations",
                    Map.of("action", "NEW_CONVERSATION", "conversationId", conversationId));
        }
        return getParticipants(conversationId);
    }

    @Override
    @Transactional
    public void removeParticipant(Long conversationId, Long targetAccountId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        ChatConversation conv = requireConversation(conversationId);

        if (conv.getConversationType() == ConversationTypeEnum.PRIVATE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Private chat không thể xóa thành viên");
        }
        if (!isAdminOrOwner(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER/ADMIN mới xoá thành viên");
        }
        ChatParticipant target = requireActiveParticipant(conversationId, targetAccountId);
        if (target.getRoleInConversation() == ParticipantRoleEnum.OWNER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể xoá OWNER");
        }
        participantRepo.markAsLeft(target.getId());

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/participant-changed",
                Map.of("action", "REMOVED", "accountId", targetAccountId));
        messagingTemplate.convertAndSend(
                "/topic/user/" + targetAccountId + "/conversations",
                Map.of("action", "REMOVED_FROM_CONVERSATION", "conversationId", conversationId));
    }

    @Override
    @Transactional
    public void updateParticipantRole(Long conversationId, Long targetAccountId, String role) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);

        ParticipantRoleEnum newRole = parseEnum(ParticipantRoleEnum.class, role,
                "Vai trò không hợp lệ");
        if (newRole == ParticipantRoleEnum.OWNER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Để chuyển quyền OWNER dùng API transferOwnership");
        }

        ChatParticipant target = requireActiveParticipant(conversationId, targetAccountId);
        if (!isAdminOrOwner(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER/ADMIN mới đổi vai trò");
        }
        if (target.getRoleInConversation() == ParticipantRoleEnum.OWNER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể đổi vai trò OWNER");
        }
        target.setRoleInConversation(newRole);
        target.setIsAdmin(newRole == ParticipantRoleEnum.ADMIN);
        participantRepo.save(target);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/role-changed",
                Map.of("accountId", targetAccountId, "role", newRole.name()));
    }

    @Override
    @Transactional
    public void muteParticipant(Long conversationId, Long targetAccountId,
                                LocalDateTime mutedUntil, String reason) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        if (!isModeratorOrAbove(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ MODERATOR+ mới mute");
        }
        ChatParticipant target = requireActiveParticipant(conversationId, targetAccountId);
        if (target.getRoleInConversation() == ParticipantRoleEnum.OWNER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể mute OWNER");
        }
        target.setChatStatus(ChatStatusEnum.MUTED);
        target.setMutedUntil(mutedUntil);
        target.setMutedReason(reason);
        participantRepo.save(target);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/participant-changed",
                Map.of("action", "MUTED", "accountId", targetAccountId));
    }

    @Override
    @Transactional
    public void unmuteParticipant(Long conversationId, Long targetAccountId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        if (!isModeratorOrAbove(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ MODERATOR+ mới unmute");
        }
        ChatParticipant target = requireActiveParticipant(conversationId, targetAccountId);
        target.setChatStatus(ChatStatusEnum.ACTIVE);
        target.setMutedUntil(null);
        target.setMutedReason(null);
        participantRepo.save(target);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/participant-changed",
                Map.of("action", "UNMUTED", "accountId", targetAccountId));
    }

    @Override
    @Transactional
    public void banParticipant(Long conversationId, Long targetAccountId, String reason) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        if (!isAdminOrOwner(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER/ADMIN mới ban");
        }
        ChatParticipant target = requireActiveParticipant(conversationId, targetAccountId);
        if (target.getRoleInConversation() == ParticipantRoleEnum.OWNER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không thể ban OWNER");
        }
        target.setChatStatus(ChatStatusEnum.BANNED);
        target.setBanReason(reason);
        participantRepo.save(target);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/participant-changed",
                Map.of("action", "BANNED", "accountId", targetAccountId));
    }

    @Override
    @Transactional
    public void unbanParticipant(Long conversationId, Long targetAccountId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        if (!isAdminOrOwner(mePart)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER/ADMIN mới unban");
        }
        ChatParticipant target = requireActiveParticipant(conversationId, targetAccountId);
        target.setChatStatus(ChatStatusEnum.ACTIVE);
        target.setBanReason(null);
        participantRepo.save(target);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/participant-changed",
                Map.of("action", "UNBANNED", "accountId", targetAccountId));
    }

    @Override
    @Transactional
    public void transferOwnership(Long conversationId, Long newOwnerAccountId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant mePart = requireActiveParticipant(conversationId, me);
        if (mePart.getRoleInConversation() != ParticipantRoleEnum.OWNER) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ OWNER mới chuyển quyền");
        }
        if (newOwnerAccountId.equals(me)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Bạn đã là OWNER");
        }
        ChatParticipant newOwner = requireActiveParticipant(conversationId, newOwnerAccountId);

        mePart.setRoleInConversation(ParticipantRoleEnum.ADMIN);
        mePart.setIsAdmin(true);
        newOwner.setRoleInConversation(ParticipantRoleEnum.OWNER);
        newOwner.setIsAdmin(true);
        participantRepo.save(mePart);
        participantRepo.save(newOwner);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/ownership-transferred",
                Map.of("newOwnerId", newOwnerAccountId));
    }

    // ==================== MESSAGES ====================

    @Override
    @Transactional
    public MessageResponse sendMessage(Long conversationId, SendMessageRequest request) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant part = requireActiveParticipant(conversationId, me);
        ChatConversation conv = requireConversation(conversationId);

        checkCanSend(part, conv);
        validateMessageContent(request);

        ChatMessage msg = new ChatMessage();
        msg.setConversationId(conversationId);
        msg.setSenderId(me);
        msg.setMessageType(parseEnum(MessageTypeEnum.class, request.getMessageType(),
                "Loại tin nhắn không hợp lệ"));
        msg.setContent(request.getContent());
        msg.setFileUrl(request.getFileUrl());
        msg.setFileName(request.getFileName());
        msg.setFileSize(request.getFileSize());
        msg.setMimeType(request.getMimeType());
        msg.setFileFormat(request.getFileFormat());
        msg.setReplyToMessageId(request.getReplyToMessageId());
        msg = messageRepo.save(msg);

        conv.setLastMessageId(msg.getId());
        conv.setLastMessageAt(msg.getCreatedAt());
        conversationRepo.save(conv);

        String preview = buildPreview(msg);
        participantRepo.incrementUnreadForOthers(conversationId, me, preview);
        participantRepo.updateSenderPreview(conversationId, me, preview);

        MessageResponse response = toMessageResponse(msg, me);
        try {
            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, response);
        } catch (Exception e) {
            log.warn("[WS] sendMessage broadcast failed: {}", e.getMessage());
        }
        return response;
    }

    @Override
    public List<MessageResponse> getMessages(Long conversationId, int page, int size) {
        Long me = SecurityUtils.requireCurrentAccountId();
        requireActiveParticipant(conversationId, me);

        int safeSize = Math.max(1, Math.min(size, 200));
        Page<ChatMessage> p = messageRepo.findByConversationDesc(
                conversationId, PageRequest.of(page, safeSize));

        // Batch load senders + reply senders
        List<ChatMessage> messages = p.getContent();
        Set<Long> accountIds = new HashSet<>();
        for (ChatMessage m : messages) {
            accountIds.add(m.getSenderId());
        }
        Map<Long, Account> accountMap = accountIds.isEmpty() ? Map.of()
                : accountRepo.findAllById(accountIds).stream()
                    .collect(Collectors.toMap(Account::getId, a -> a));

        // Batch load reply messages
        Set<Long> replyIds = messages.stream()
                .map(ChatMessage::getReplyToMessageId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, ChatMessage> replyMap = replyIds.isEmpty() ? Map.of()
                : messageRepo.findAllById(replyIds).stream()
                    .collect(Collectors.toMap(ChatMessage::getId, m -> m));

        Set<Long> replySenderIds = replyMap.values().stream()
                .map(ChatMessage::getSenderId).collect(Collectors.toSet());
        Map<Long, Account> replySenderMap = replySenderIds.isEmpty() ? Map.of()
                : accountRepo.findAllById(replySenderIds).stream()
                    .collect(Collectors.toMap(Account::getId, a -> a));

        List<MessageResponse> list = messages.stream()
                .map(m -> toMessageResponseWithCache(m, accountMap, replyMap, replySenderMap))
                .collect(Collectors.toList());
        Collections.reverse(list);
        return list;
    }

    @Override
    @Transactional
    public void markAsRead(Long conversationId, Long lastReadMessageId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        requireActiveParticipant(conversationId, me);
        if (lastReadMessageId != null) {
            ChatMessage msg = messageRepo.findById(lastReadMessageId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Message không tồn tại"));
            if (!msg.getConversationId().equals(conversationId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Message không thuộc conversation này");
            }
        }
        participantRepo.markAsRead(conversationId, me, lastReadMessageId);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/read",
                Map.of("accountId", me, "lastReadMessageId", lastReadMessageId));
    }

    @Override
    @Transactional
    public MessageResponse editMessage(Long messageId, String newContent) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatMessage msg = requireMessage(messageId);
        ChatParticipant msgPart = requireActiveParticipant(msg.getConversationId(), me);
        ChatConversation msgConv = requireConversation(msg.getConversationId());
        checkCanSend(msgPart, msgConv);
        if (!msg.getSenderId().equals(me)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ sửa được tin của chính mình");
        }
        if (Boolean.TRUE.equals(msg.getIsDeleted())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tin nhắn đã bị xoá");
        }
        if (newContent == null || newContent.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Nội dung không được trống");
        }
        if (newContent.length() > 10000) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Nội dung vượt quá 10000 ký tự");
        }
        messageRepo.updateContent(messageId, newContent);
        ChatMessage updated = requireMessage(messageId);
        MessageResponse response = toMessageResponse(updated, me);
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + msg.getConversationId() + "/edit", response);
        return response;
    }

    @Override
    @Transactional
    public void deleteMessage(Long messageId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatMessage msg = requireMessage(messageId);
        ChatParticipant part = requireActiveParticipant(msg.getConversationId(), me);

        boolean isSender = msg.getSenderId().equals(me);
        boolean canModerate = isModeratorOrAbove(part);
        if (!isSender && !canModerate) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Không có quyền xoá tin này");
        }
        messageRepo.softDelete(messageId);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + msg.getConversationId() + "/message-deleted",
                Map.of("messageId", messageId));
    }

    // ==================== PERSONAL PREFERENCES ====================

    @Override
    @Transactional
    public void pinConversation(Long conversationId, boolean pinned) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant p = requireActiveParticipant(conversationId, me);
        p.setIsPinned(pinned);
        participantRepo.save(p);
        broadcastPreference(me, conversationId, "pinned", pinned);
    }

    @Override
    @Transactional
    public void muteConversationByUser(Long conversationId, boolean muted) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant p = requireActiveParticipant(conversationId, me);
        p.setIsMutedByUser(muted);
        participantRepo.save(p);
        broadcastPreference(me, conversationId, "mutedByUser", muted);
    }

    @Override
    @Transactional
    public void archiveConversation(Long conversationId, boolean archived) {
        Long me = SecurityUtils.requireCurrentAccountId();
        ChatParticipant p = requireActiveParticipant(conversationId, me);
        p.setIsArchived(archived);
        participantRepo.save(p);
        broadcastPreference(me, conversationId, "archived", archived);
    }

    // ==================== SEARCH ====================

    @Override
    public List<UserSearchResponse> searchUsers(String keyword) {
        Long me = SecurityUtils.requireCurrentAccountId();
        if (keyword == null || keyword.trim().length() < 2 || keyword.length() > 100) return List.of();

        List<Account> accounts = accountRepo
                .searchAccounts("", true, keyword.trim(), PageRequest.of(0, 20))
                .getContent();

        List<Account> others = accounts.stream()
                .filter(a -> !a.getId().equals(me))
                .collect(Collectors.toList());

        Set<String> keys = others.stream()
                .map(a -> Math.min(me, a.getId()) + ":" + Math.max(me, a.getId()))
                .collect(Collectors.toSet());
        Map<String, ChatConversation> convMap = keys.isEmpty() ? Map.of()
                : conversationRepo.findByPrivateChatKeyIn(keys).stream()
                    .collect(Collectors.toMap(ChatConversation::getPrivateChatKey, c -> c));

        return others.stream()
                .map(a -> {
                    String key = Math.min(me, a.getId()) + ":" + Math.max(me, a.getId());
                    ChatConversation existing = convMap.get(key);
                    return UserSearchResponse.builder()
                            .accountId(a.getId())
                            .username(a.getEmail())
                            .fullName(a.getUserProfile() != null ? a.getUserProfile().getFullName() : a.getEmail())
                            .email(a.getEmail())
                            .phone(a.getUserProfile() != null ? a.getUserProfile().getPhone() : null)
                            .avatarUrl(a.getUserProfile() != null ? a.getUserProfile().getAvatarUrl() : null)
                            .hasPrivateConversation(existing != null)
                            .existingConversationId(existing != null ? existing.getId() : null)
                            .build();
                }).collect(Collectors.toList());
    }

    // ==================== HELPERS ====================

    private ChatConversation requireConversation(Long id) {
        return conversationRepo.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Conversation không tồn tại"));
    }

    private ChatMessage requireMessage(Long id) {
        return messageRepo.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Tin nhắn không tồn tại"));
    }

    private ChatParticipant requireActiveParticipant(Long convId, Long accountId) {
        return participantRepo.findByConversationIdAndAccountIdAndLeftAtIsNull(convId, accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Bạn không phải thành viên của conversation này"));
    }

    private boolean isAdminOrOwner(ChatParticipant p) {
        return p.getRoleInConversation() == ParticipantRoleEnum.OWNER
                || p.getRoleInConversation() == ParticipantRoleEnum.ADMIN;
    }

    private boolean isModeratorOrAbove(ChatParticipant p) {
        return isAdminOrOwner(p) || p.getRoleInConversation() == ParticipantRoleEnum.MODERATOR;
    }

    private void checkCanSend(ChatParticipant p, ChatConversation conv) {
        if (p.getChatStatus() == ChatStatusEnum.BANNED) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn đã bị cấm chat");
        }
        if (p.getChatStatus() == ChatStatusEnum.MUTED) {
            if (p.getMutedUntil() != null && p.getMutedUntil().isAfter(LocalDateTime.now())) {
                throw new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Bạn đang bị mute đến " + p.getMutedUntil());
            }
            // Hết hạn mute → tự động unmute
            p.setChatStatus(ChatStatusEnum.ACTIVE);
            p.setMutedUntil(null);
            p.setMutedReason(null);
            participantRepo.save(p);
        }
        if (conv.getMessagePermission() == MessagePermissionEnum.READ_ONLY) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Conversation đang ở chế độ chỉ đọc");
        }
        if (conv.getMessagePermission() == MessagePermissionEnum.ADMIN_ONLY && !isModeratorOrAbove(p)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ quản trị viên mới được gửi tin");
        }
    }

    private void validateMessageContent(SendMessageRequest req) {
        boolean hasContent = req.getContent() != null && !req.getContent().isBlank();
        boolean hasFile = req.getFileUrl() != null && !req.getFileUrl().isBlank();
        if (!hasContent && !hasFile) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Tin nhắn phải có nội dung hoặc file đính kèm");
        }
    }

    private void addParticipant(Long convId, Long accountId, ParticipantRoleEnum role) {
        ChatParticipant p = new ChatParticipant();
        p.setConversationId(convId);
        p.setAccountId(accountId);
        p.setRoleInConversation(role);
        p.setChatStatus(ChatStatusEnum.ACTIVE);
        p.setIsAdmin(role == ParticipantRoleEnum.OWNER || role == ParticipantRoleEnum.ADMIN);
        participantRepo.save(p);
    }

    private String buildPreview(ChatMessage msg) {
        if (msg.getMessageType() == MessageTypeEnum.TEXT) {
            return msg.getContent() != null && msg.getContent().length() > 255
                    ? msg.getContent().substring(0, 255) : msg.getContent();
        }
        return "[" + msg.getMessageType().name() + "]";
    }

    private <T extends Enum<T>> T parseEnum(Class<T> clazz, String value, String errorMsg) {
        if (value == null || value.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, errorMsg);
        }
        try {
            return Enum.valueOf(clazz, value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, errorMsg);
        }
    }

    private void broadcastNewConversation(Long convId, List<Long> accountIds) {
        for (Long accId : accountIds) {
            try {
                messagingTemplate.convertAndSend(
                        "/topic/user/" + accId + "/conversations",
                        Map.of("action", "NEW_CONVERSATION", "conversationId", convId));
            } catch (Exception e) {
                log.warn("[WS] broadcastNewConversation failed for {}: {}", accId, e.getMessage());
            }
        }
    }

    private void broadcastPreference(Long accountId, Long convId, String field, boolean value) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/user/" + accountId + "/conversations",
                    Map.of("action", "PREFERENCE_CHANGED",
                           "conversationId", convId,
                           "field", field,
                           "value", value));
        } catch (Exception e) {
            log.warn("[WS] broadcastPreference failed: {}", e.getMessage());
        }
    }

    // ==================== MAPPER ====================

    private ConversationResponse toConversationResponse(ChatConversation conv, Long me,
                                                        boolean includeParticipants) {
        List<ChatParticipant> participants = includeParticipants
                ? participantRepo.findByConversationIdAndLeftAtIsNull(conv.getId())
                : participantRepo.findByConversationIdInAndLeftAtIsNull(List.of(conv.getId()));

        Set<Long> accountIds = participants.stream()
                .map(ChatParticipant::getAccountId).collect(Collectors.toSet());
        Map<Long, Account> accountMap = accountIds.isEmpty() ? Map.of()
                : accountRepo.findAllById(accountIds).stream()
                    .collect(Collectors.toMap(Account::getId, a -> a));

        return toConversationResponseWithCache(conv, me, participants, accountMap, includeParticipants);
    }

    private ConversationResponse toConversationResponseWithCache(
            ChatConversation conv, Long me, List<ChatParticipant> participants,
            Map<Long, Account> accountMap, boolean includeParticipants) {

        ChatParticipant mine = participants.stream()
                .filter(p -> p.getAccountId().equals(me))
                .findFirst().orElse(null);

        // displayName cho PRIVATE
        String displayName = conv.getName();
        if (conv.getConversationType() == ConversationTypeEnum.PRIVATE && displayName == null) {
            ChatParticipant other = participants.stream()
                    .filter(p -> !p.getAccountId().equals(me))
                    .findFirst().orElse(null);
            if (other != null) {
                Account acc = accountMap.get(other.getAccountId());
                if (acc != null) {
                    displayName = acc.getUserProfile() != null
                            ? acc.getUserProfile().getFullName()
                            : acc.getEmail();
                }
            }
        }

        ConversationResponse.ConversationResponseBuilder builder = ConversationResponse.builder()
                .id(conv.getId())
                .conversationType(conv.getConversationType().name())
                .name(displayName)
                .courseId(conv.getCourseId())
                .createdBy(conv.getCreatedBy())
                .lastMessageId(conv.getLastMessageId())
                .lastMessageAt(conv.getLastMessageAt())
                .messagePermission(conv.getMessagePermission().name())
                .privateChatKey(conv.getPrivateChatKey())
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt());

        if (mine != null) {
            builder.unreadCount(mine.getUnreadCount())
                    .lastMessagePreview(mine.getLastMessagePreview())
                    .isPinned(mine.getIsPinned())
                    .isMutedByUser(mine.getIsMutedByUser())
                    .isArchived(mine.getIsArchived());
        }

        if (includeParticipants) {
            List<ConversationResponse.ParticipantInfo> infos = participants.stream()
                    .map(p -> {
                        Account acc = accountMap.get(p.getAccountId());
                        return ConversationResponse.ParticipantInfo.builder()
                                .accountId(p.getAccountId())
                                .username(acc != null ? acc.getEmail() : null)
                                .fullName(acc != null && acc.getUserProfile() != null
                                        ? acc.getUserProfile().getFullName() : null)
                                .avatarUrl(acc != null && acc.getUserProfile() != null
                                        ? acc.getUserProfile().getAvatarUrl() : null)
                                .isAdmin(p.getIsAdmin())
                                .roleInConversation(p.getRoleInConversation().name())
                                .build();
                    }).collect(Collectors.toList());
            builder.participants(infos);
        }

        return builder.build();
    }

    private List<ParticipantResponse> enrichParticipants(List<ChatParticipant> participants) {
        if (participants.isEmpty()) return List.of();
        Set<Long> accountIds = participants.stream()
                .map(ChatParticipant::getAccountId).collect(Collectors.toSet());
        Map<Long, Account> accountMap = accountRepo.findAllById(accountIds).stream()
                .collect(Collectors.toMap(Account::getId, a -> a));

        return participants.stream().map(p -> {
            Account acc = accountMap.get(p.getAccountId());
            return ParticipantResponse.builder()
                    .id(p.getId())
                    .conversationId(p.getConversationId())
                    .accountId(p.getAccountId())
                    .username(acc != null ? acc.getEmail() : null)
                    .fullName(acc != null && acc.getUserProfile() != null
                            ? acc.getUserProfile().getFullName() : null)
                    .avatarUrl(acc != null && acc.getUserProfile() != null
                            ? acc.getUserProfile().getAvatarUrl() : null)
                    .roleInConversation(p.getRoleInConversation().name())
                    .chatStatus(p.getChatStatus().name())
                    .isAdmin(p.getIsAdmin())
                    .mutedUntil(p.getMutedUntil())
                    .mutedReason(p.getMutedReason())
                    .banReason(p.getBanReason())
                    .unreadCount(p.getUnreadCount())
                    .lastReadMessageId(p.getLastReadMessageId())
                    .joinedAt(p.getJoinedAt())
                    .leftAt(p.getLeftAt())
                    .build();
        }).collect(Collectors.toList());
    }

    private MessageResponse toMessageResponse(ChatMessage msg, Long me) {
        Account sender = accountRepo.findById(msg.getSenderId()).orElse(null);
        ChatMessage reply = msg.getReplyToMessageId() != null
                ? messageRepo.findById(msg.getReplyToMessageId()).orElse(null) : null;
        Account replySender = reply != null
                ? accountRepo.findById(reply.getSenderId()).orElse(null) : null;

        return buildMessageResponse(msg, sender, reply, replySender);
    }

    private MessageResponse toMessageResponseWithCache(
            ChatMessage msg, Map<Long, Account> accountMap,
            Map<Long, ChatMessage> replyMap, Map<Long, Account> replySenderMap) {
        Account sender = accountMap.get(msg.getSenderId());
        ChatMessage reply = msg.getReplyToMessageId() != null
                ? replyMap.get(msg.getReplyToMessageId()) : null;
        Account replySender = reply != null
                ? replySenderMap.get(reply.getSenderId()) : null;
        return buildMessageResponse(msg, sender, reply, replySender);
    }

    private MessageResponse buildMessageResponse(
            ChatMessage msg, Account sender, ChatMessage reply, Account replySender) {
        return MessageResponse.builder()
                .id(msg.getId())
                .conversationId(msg.getConversationId())
                .senderId(msg.getSenderId())
                .senderName(sender != null
                        ? (sender.getUserProfile() != null
                            ? sender.getUserProfile().getFullName() : sender.getEmail())
                        : null)
                .senderAvatarUrl(sender != null && sender.getUserProfile() != null
                        ? sender.getUserProfile().getAvatarUrl() : null)
                .messageType(msg.getMessageType().name())
                .content(msg.getContent())
                .fileUrl(msg.getFileUrl())
                .fileName(msg.getFileName())
                .fileSize(msg.getFileSize())
                .mimeType(msg.getMimeType())
                .fileFormat(msg.getFileFormat())
                .replyToMessageId(msg.getReplyToMessageId())
                .replyToContent(reply != null ? reply.getContent() : null)
                .replyToSenderName(replySender != null
                        ? (replySender.getUserProfile() != null
                            ? replySender.getUserProfile().getFullName() : replySender.getEmail())
                        : null)
                .isDeleted(msg.getIsDeleted())
                .isEdited(msg.getIsEdited())
                .createdAt(msg.getCreatedAt())
                .updatedAt(msg.getUpdatedAt())
                .build();
    }
}